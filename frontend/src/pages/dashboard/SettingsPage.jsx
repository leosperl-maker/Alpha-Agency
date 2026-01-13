import { useState, useEffect } from "react";
import { Save, Building, Key, Share2, FileText, Database, Trash2, AlertTriangle, Loader2, Bell, Mail, Send, CheckCircle, XCircle, RefreshCw, ExternalLink, FileEdit, Eye, TestTube, Settings } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { settingsAPI, notificationsAPI, apiKeysAPI } from "../../lib/api";
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

  // Invoice/Quote default settings
  const [invoiceSettings, setInvoiceSettings] = useState({
    default_payment_terms: "30",
    default_tva_rate: "8.5",
    default_conditions: `• Ce devis est valable 30 jours à compter de sa date d'émission.
• Paiement par virement bancaire ou carte bancaire.
• Le règlement doit intervenir sous 30 jours après réception de la facture.
• Tout retard de paiement entraînera des pénalités de retard.`,
    bank_details: `IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX
BIC: XXXXXXXX
Banque: Votre Banque`,
    footer_text: "Merci de votre confiance - Alpha Agency",
    signature_text: "Bon pour accord, le client :",
    show_logo: true,
    logo_position: "left"
  });
  const [savingInvoiceSettings, setSavingInvoiceSettings] = useState(false);

  const [dataStats, setDataStats] = useState(null);
  const [deletingData, setDeletingData] = useState(false);

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    task_reminders: true,
    task_reminder_days: 1,
    invoice_reminders: true,
    invoice_reminder_days: [7, 14, 30],
    new_lead_notifications: true,
    admin_email: ""
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState(null);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [testingService, setTestingService] = useState(null);

  // Email Templates state
  const [emailTemplates, setEmailTemplates] = useState({
    devis: { subject: "", body: "" },
    facture: { subject: "", body: "" }
  });
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(null);
  const [testingTemplate, setTestingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [emailLogo, setEmailLogo] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchNotificationSettings();
    fetchApiKeys();
    fetchInvoiceSettings();
    fetchEmailTemplates();
  }, []);

  const fetchEmailTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.get('/settings/email-templates');
      if (res.data) {
        setEmailTemplates({
          devis: res.data.devis || { subject: "", body: "" },
          facture: res.data.facture || { subject: "", body: "" }
        });
        setTestEmailAddress(res.data.test_email || "");
        setEmailLogo(res.data.logo_url || "");
      }
    } catch (error) {
      console.error("Error fetching email templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveEmailTemplate = async (templateType) => {
    setSavingTemplate(templateType);
    try {
      await api.put(`/settings/email-templates/${templateType}`, {
        ...emailTemplates[templateType],
        test_email: testEmailAddress,
        logo_url: emailLogo
      });
      toast.success(`Template ${templateType === 'devis' ? 'Devis' : 'Facture'} sauvegardé`);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingTemplate(null);
    }
  };

  const handleTestEmailTemplate = async (templateType) => {
    if (!testEmailAddress) {
      toast.error("Veuillez entrer une adresse email de test");
      return;
    }
    setTestingTemplate(templateType);
    try {
      const res = await api.post('/settings/email-templates/test', { 
        template_type: templateType,
        test_email: testEmailAddress
      });
      toast.success(res.data.message || "Email de test envoyé");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi du test");
    } finally {
      setTestingTemplate(null);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'email_logo');
      
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.url) {
        setEmailLogo(res.data.url);
        toast.success("Logo uploadé avec succès");
      }
    } catch (error) {
      toast.error("Erreur lors de l'upload du logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Fonction pour générer une prévisualisation de l'email
  const generateEmailPreview = (templateType) => {
    const template = emailTemplates[templateType];
    const sampleData = {
      numero: templateType === 'devis' ? 'DEV-2026-0001' : 'FAC-2026-0001',
      client_name: 'Jean Dupont',
      montant: '1 250.00',
      company_name: 'Alpha Agency',
      company_phone: '0590 68 00 01',
      company_email: 'contact@alphagency.fr'
    };
    
    let subject = template.subject || `Votre ${templateType} {{numero}} - {{company_name}}`;
    let body = template.body || `Bonjour {{client_name}},\n\nVeuillez trouver ci-joint votre ${templateType} {{numero}} d'un montant de {{montant}} €.\n\nCordialement,\n{{company_name}}`;
    
    // Remplacer les variables
    Object.entries(sampleData).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    
    return { subject, body };
  };

  const fetchInvoiceSettings = async () => {
    try {
      const res = await settingsAPI.getInvoiceSettings();
      if (res.data) {
        setInvoiceSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error("Error fetching invoice settings:", error);
    }
  };

  const handleSaveInvoiceSettings = async () => {
    setSavingInvoiceSettings(true);
    try {
      await settingsAPI.updateInvoiceSettings(invoiceSettings);
      toast.success("Paramètres des devis/factures sauvegardés");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingInvoiceSettings(false);
    }
  };

  const fetchApiKeys = async () => {
    setLoadingApiKeys(true);
    try {
      const res = await apiKeysAPI.getStatus();
      setApiKeys(res.data);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const handleTestApiKey = async (service) => {
    setTestingService(service);
    try {
      const res = await apiKeysAPI.testKey(service);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Erreur lors du test");
    } finally {
      setTestingService(null);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const res = await notificationsAPI.getSettings();
      setNotifSettings(res.data);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    try {
      await notificationsAPI.updateSettings(notifSettings);
      toast.success("Paramètres de notifications sauvegardés");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingNotif(false);
    }
  };

  const handleTestEmail = async () => {
    setSendingTest(true);
    try {
      const res = await notificationsAPI.testEmail();
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendTaskReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await notificationsAPI.sendTaskReminders();
      toast.success(res.data.message);
    } catch (error) {
      toast.error("Erreur lors de l'envoi des rappels");
    } finally {
      setSendingReminders(false);
    }
  };

  const handleSendInvoiceReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await notificationsAPI.sendInvoiceReminders();
      toast.success(res.data.message);
    } catch (error) {
      toast.error("Erreur lors de l'envoi des rappels");
    } finally {
      setSendingReminders(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchDataStats();
  }, []);

  const fetchDataStats = async () => {
    try {
      const response = await api.get('/admin/data-stats');
      setDataStats(response.data);
    } catch (error) {
      console.error("Error fetching data stats", error);
    }
  };

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

  const handleDeleteTestData = async (collection) => {
    if (!window.confirm(`Supprimer toutes les données de test de ${collection} ? Cette action est irréversible.`)) return;
    
    setDeletingData(true);
    try {
      await api.delete(`/admin/test-data/${collection}`);
      toast.success(`Données de test ${collection} supprimées`);
      fetchDataStats();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingData(false);
    }
  };

  const handleClearAllTestData = async () => {
    if (!window.confirm("⚠️ ATTENTION: Supprimer TOUTES les données de test de toutes les collections ? Cette action est irréversible !")) return;
    if (!window.confirm("Êtes-vous vraiment sûr ? Cette action va supprimer toutes les données de démonstration.")) return;
    
    setDeletingData(true);
    try {
      await api.delete('/admin/test-data/all');
      toast.success("Toutes les données de test ont été supprimées");
      fetchDataStats();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingData(false);
    }
  };

  return (
    <div data-testid="settings-page" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="text-white/60">Configuration du dashboard et de l'entreprise</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-white/5 backdrop-blur-xl border border-white/10 flex-wrap">
          <TabsTrigger value="company" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="email-templates" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Mail className="w-4 h-4 mr-2" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Réseaux sociaux
          </TabsTrigger>
          <TabsTrigger value="legal" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Pages légales
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Key className="w-4 h-4 mr-2" />
            API
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Database className="w-4 h-4 mr-2" />
            Données
          </TabsTrigger>
        </TabsList>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates">
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    Templates d&apos;e-mail
                  </CardTitle>
                  <CardDescription>
                    Personnalisez les e-mails envoyés avec vos devis et factures
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchEmailTemplates} disabled={loadingTemplates}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingTemplates ? "animate-spin" : ""}`} />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Paramètres généraux */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Paramètres généraux
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email de test */}
                      <div>
                        <Label className="text-white">Adresse email de test</Label>
                        <Input
                          type="email"
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                          placeholder="test@exemple.com"
                          className="bg-white/5 border-white/10 text-white mt-1"
                        />
                        <p className="text-xs text-white/40 mt-1">
                          Les emails de test seront envoyés à cette adresse
                        </p>
                      </div>
                      {/* Logo */}
                      <div>
                        <Label className="text-white">Logo pour les emails</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={emailLogo}
                            onChange={(e) => setEmailLogo(e.target.value)}
                            placeholder="URL du logo ou glissez un fichier"
                            className="bg-white/5 border-white/10 text-white flex-1"
                          />
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                            <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                              <span>
                                {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
                              </span>
                            </Button>
                          </label>
                        </div>
                        {emailLogo && (
                          <div className="mt-2 p-2 bg-white rounded">
                            <img src={emailLogo} alt="Logo email" className="max-h-12 object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variables disponibles */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-medium text-indigo-900 mb-2">Variables disponibles</h4>
                    <p className="text-sm text-indigo-700 mb-2">
                      Utilisez ces variables dans vos templates. Elles seront remplacées automatiquement :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["{{numero}}", "{{client_name}}", "{{montant}}", "{{company_name}}", "{{company_phone}}", "{{company_email}}"].map(v => (
                        <Badge key={v} variant="outline" className="bg-white text-indigo-700 border-indigo-300 font-mono text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Template Devis */}
                  <div className="border border-white/10 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 border-0">DEVIS</Badge>
                        <h3 className="font-medium text-white">Template e-mail Devis</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setPreviewTemplate(previewTemplate === 'devis' ? null : 'devis')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">{previewTemplate === 'devis' ? 'Masquer' : 'Aperçu'}</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTestEmailTemplate('devis')}
                          disabled={testingTemplate === 'devis' || !testEmailAddress}
                        >
                          {testingTemplate === 'devis' ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4 mr-1" />
                          )}
                          <span className="hidden sm:inline">Tester</span>
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleSaveEmailTemplate('devis')}
                          disabled={savingTemplate === 'devis'}
                          className="bg-indigo-600 hover:bg-indigo-500"
                        >
                          {savingTemplate === 'devis' ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          <span className="hidden sm:inline">Sauvegarder</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preview email devis */}
                    {previewTemplate === 'devis' && (
                      <div className="mb-4 border border-indigo-500/30 rounded-lg overflow-hidden">
                        <div className="bg-indigo-500/20 px-4 py-2 text-sm text-indigo-300">
                          Aperçu de l&apos;email (avec données exemple)
                        </div>
                        <div className="bg-white p-4">
                          {emailLogo && (
                            <img src={emailLogo} alt="Logo" className="max-h-12 mb-4" />
                          )}
                          <p className="text-xs text-gray-500 mb-1">Objet:</p>
                          <p className="font-medium text-gray-800 mb-4 pb-2 border-b">
                            {generateEmailPreview('devis').subject}
                          </p>
                          <div className="text-gray-700 whitespace-pre-wrap text-sm">
                            {generateEmailPreview('devis').body}
                          </div>
                          <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                            <p>📎 Pièce jointe: devis_DEV-2026-0001.pdf</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Objet de l&apos;email</Label>
                        <Input
                          value={emailTemplates.devis.subject}
                          onChange={(e) => setEmailTemplates(prev => ({
                            ...prev,
                            devis: { ...prev.devis, subject: e.target.value }
                          }))}
                          placeholder="Votre devis {{numero}} - {{company_name}}"
                          className="bg-white/5 border-white/10 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Corps du message</Label>
                        <Textarea
                          value={emailTemplates.devis.body}
                          onChange={(e) => setEmailTemplates(prev => ({
                            ...prev,
                            devis: { ...prev.devis, body: e.target.value }
                          }))}
                          placeholder={`Bonjour {{client_name}},

Veuillez trouver ci-joint votre devis {{numero}} d'un montant de {{montant}} €.

N'hésitez pas à nous contacter pour toute question.

Cordialement,
{{company_name}}
{{company_phone}} - {{company_email}}`}
                          rows={8}
                          className="bg-white/5 border-white/10 text-white mt-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Template Facture */}
                  <div className="border border-white/10 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-400 border-0">FACTURE</Badge>
                        <h3 className="font-medium text-white">Template e-mail Facture</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setPreviewTemplate(previewTemplate === 'facture' ? null : 'facture')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">{previewTemplate === 'facture' ? 'Masquer' : 'Aperçu'}</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTestEmailTemplate('facture')}
                          disabled={testingTemplate === 'facture' || !testEmailAddress}
                        >
                          {testingTemplate === 'facture' ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4 mr-1" />
                          )}
                          <span className="hidden sm:inline">Tester</span>
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleSaveEmailTemplate('facture')}
                          disabled={savingTemplate === 'facture'}
                          className="bg-indigo-600 hover:bg-indigo-500"
                        >
                          {savingTemplate === 'facture' ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          <span className="hidden sm:inline">Sauvegarder</span>
                        </Button>
                      </div>
                    </div>

                    {/* Preview email facture */}
                    {previewTemplate === 'facture' && (
                      <div className="mb-4 border border-green-500/30 rounded-lg overflow-hidden">
                        <div className="bg-green-500/20 px-4 py-2 text-sm text-green-300">
                          Aperçu de l&apos;email (avec données exemple)
                        </div>
                        <div className="bg-white p-4">
                          {emailLogo && (
                            <img src={emailLogo} alt="Logo" className="max-h-12 mb-4" />
                          )}
                          <p className="text-xs text-gray-500 mb-1">Objet:</p>
                          <p className="font-medium text-gray-800 mb-4 pb-2 border-b">
                            {generateEmailPreview('facture').subject}
                          </p>
                          <div className="text-gray-700 whitespace-pre-wrap text-sm">
                            {generateEmailPreview('facture').body}
                          </div>
                          <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                            <p>📎 Pièce jointe: facture_FAC-2026-0001.pdf</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Objet de l&apos;email</Label>
                        <Input
                          value={emailTemplates.facture.subject}
                          onChange={(e) => setEmailTemplates(prev => ({
                            ...prev,
                            facture: { ...prev.facture, subject: e.target.value }
                          }))}
                          placeholder="Votre facture {{numero}} - {{company_name}}"
                          className="bg-white/5 border-white/10 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Corps du message</Label>
                        <Textarea
                          value={emailTemplates.facture.body}
                          onChange={(e) => setEmailTemplates(prev => ({
                            ...prev,
                            facture: { ...prev.facture, body: e.target.value }
                          }))}
                          placeholder={`Bonjour {{client_name}},

Veuillez trouver ci-joint votre facture {{numero}} d'un montant de {{montant}} €.

Nous vous remercions de procéder au règlement dans les meilleurs délais.

Cordialement,
{{company_name}}
{{company_phone}} - {{company_email}}`}
                          rows={8}
                          className="bg-white/5 border-white/10 text-white mt-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-400" />
                    Clés API connectées
                  </CardTitle>
                  <CardDescription>
                    État de toutes les intégrations API de votre application
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchApiKeys} disabled={loadingApiKeys}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingApiKeys ? "animate-spin" : ""}`} />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingApiKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : apiKeys ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-indigo-400">{apiKeys.total_configured}</p>
                      <p className="text-sm text-white/60">sur {apiKeys.total_available} configurées</p>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full" 
                          style={{ width: `${(apiKeys.total_configured / apiKeys.total_available) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* API Keys List */}
                  <div className="space-y-3">
                    {Object.entries(apiKeys.api_keys).map(([key, config]) => (
                      <div key={key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.configured ? "bg-green-100" : "bg-gray-100"}`}>
                            {config.configured ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{config.name}</p>
                            <p className="text-sm text-white/60">{config.description}</p>
                            {config.configured && config.masked && (
                              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                                {config.masked}
                              </code>
                            )}
                            {key === "newsapi" && config.count && (
                              <Badge className="ml-2 bg-blue-500/20 text-blue-400">{config.count} clés</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {config.configured && ["brevo", "newsapi", "perplexity", "cloudinary"].includes(key) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleTestApiKey(key)}
                              disabled={testingService === key}
                            >
                              {testingService === key ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Tester"
                              )}
                            </Button>
                          )}
                          <a 
                            href={config.doc_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline text-sm flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Docs
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-700">
                      <strong>Note :</strong> Les clés API sont configurées dans les fichiers d'environnement du serveur. 
                      Pour modifier une clé, contactez l'administrateur système ou mettez à jour le fichier <code className="bg-blue-100 px-1 rounded">.env</code>.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-white/60 py-8">Impossible de charger les informations</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                Notifications par email
              </CardTitle>
              <CardDescription>
                Configurez les notifications automatiques par email (via Brevo)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test Email */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">Tester la configuration</p>
                  <p className="text-sm text-white/60">Envoyer un email de test à votre adresse</p>
                </div>
                <Button
                  onClick={handleTestEmail}
                  disabled={sendingTest}
                  variant="outline"
                  className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                >
                  {sendingTest ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Envoyer un test
                </Button>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                {/* Task Reminders */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Rappels de tâches</p>
                    <p className="text-sm text-white/60">Recevoir un email pour les tâches à échéance proche</p>
                  </div>
                  <Switch
                    checked={notifSettings.task_reminders}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, task_reminders: checked }))}
                  />
                </div>

                {notifSettings.task_reminders && (
                  <div className="ml-4 flex items-center gap-2">
                    <Label className="text-sm text-white/60">Rappeler</Label>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={notifSettings.task_reminder_days}
                      onChange={(e) => setNotifSettings(prev => ({ ...prev, task_reminder_days: parseInt(e.target.value) || 1 }))}
                      className="w-16 bg-white/5 backdrop-blur-xl border-white/10"
                    />
                    <Label className="text-sm text-white/60">jour(s) avant l'échéance</Label>
                  </div>
                )}

                {/* Invoice Reminders */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Rappels de factures impayées</p>
                    <p className="text-sm text-white/60">Envoyer des rappels aux clients pour les factures en retard</p>
                  </div>
                  <Switch
                    checked={notifSettings.invoice_reminders}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, invoice_reminders: checked }))}
                  />
                </div>

                {notifSettings.invoice_reminders && (
                  <div className="ml-4">
                    <p className="text-sm text-white/60 mb-2">Envoyer un rappel après :</p>
                    <div className="flex gap-2">
                      {[7, 14, 30, 60].map((days) => (
                        <Button
                          key={days}
                          variant={notifSettings.invoice_reminder_days.includes(days) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setNotifSettings(prev => ({
                              ...prev,
                              invoice_reminder_days: prev.invoice_reminder_days.includes(days)
                                ? prev.invoice_reminder_days.filter(d => d !== days)
                                : [...prev.invoice_reminder_days, days].sort((a, b) => a - b)
                            }));
                          }}
                          className={notifSettings.invoice_reminder_days.includes(days) 
                            ? "bg-indigo-600 text-white" 
                            : "border-white/10"}
                        >
                          {days} jours
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Lead Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Nouveaux leads</p>
                    <p className="text-sm text-white/60">Recevoir un email pour chaque nouvelle demande de contact</p>
                  </div>
                  <Switch
                    checked={notifSettings.new_lead_notifications}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, new_lead_notifications: checked }))}
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendTaskReminders}
                    disabled={sendingReminders}
                    variant="outline"
                    size="sm"
                  >
                    {sendingReminders ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Envoyer rappels tâches
                  </Button>
                  <Button
                    onClick={handleSendInvoiceReminders}
                    disabled={sendingReminders}
                    variant="outline"
                    size="sm"
                  >
                    {sendingReminders ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Envoyer rappels factures
                  </Button>
                </div>
                <Button
                  onClick={handleSaveNotifications}
                  disabled={savingNotif}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {savingNotif ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-400" />
                Informations légales
              </CardTitle>
              <CardDescription>
                Ces informations apparaîtront sur vos devis et factures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">Raison sociale</Label>
                  <Input
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Nom commercial</Label>
                  <Input
                    value={companyInfo.commercial_name}
                    onChange={(e) => setCompanyInfo({...companyInfo, commercial_name: e.target.value})}
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Adresse</Label>
                <Input
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                  className="bg-white/5 backdrop-blur-xl border-white/10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">Téléphone</Label>
                  <Input
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Email</Label>
                  <Input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">SIREN</Label>
                  <Input
                    value={companyInfo.siren}
                    onChange={(e) => setCompanyInfo({...companyInfo, siren: e.target.value})}
                    placeholder="123 456 789"
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">SIRET</Label>
                  <Input
                    value={companyInfo.siret}
                    onChange={(e) => setCompanyInfo({...companyInfo, siret: e.target.value})}
                    placeholder="123 456 789 00012"
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Capital social</Label>
                  <Input
                    value={companyInfo.capital}
                    onChange={(e) => setCompanyInfo({...companyInfo, capital: e.target.value})}
                    placeholder="1 000 €"
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveCompany}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white hover:text-white"
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
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                Réseaux sociaux
              </CardTitle>
              <CardDescription>
                Liens vers vos profils réseaux sociaux (affichés dans le footer)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">LinkedIn</Label>
                  <Input
                    value={socialLinks.linkedin}
                    onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})}
                    placeholder="https://linkedin.com/company/..."
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Instagram</Label>
                  <Input
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                    placeholder="https://instagram.com/..."
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">Facebook</Label>
                  <Input
                    value={socialLinks.facebook}
                    onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})}
                    placeholder="https://facebook.com/..."
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Twitter / X</Label>
                  <Input
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})}
                    placeholder="https://twitter.com/..."
                    className="bg-white/5 backdrop-blur-xl border-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">YouTube</Label>
                <Input
                  value={socialLinks.youtube}
                  onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})}
                  placeholder="https://youtube.com/@..."
                  className="bg-white/5 backdrop-blur-xl border-white/10"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveSocial}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white hover:text-white"
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
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Textes des pages légales
              </CardTitle>
              <CardDescription>
                Personnalisez le contenu des pages Mentions légales, Confidentialité et Cookies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-white">Mentions légales (texte complémentaire)</Label>
                <Textarea
                  value={legalTexts.mentions_legales}
                  onChange={(e) => setLegalTexts({...legalTexts, mentions_legales: e.target.value})}
                  placeholder="Ajoutez des informations complémentaires pour vos mentions légales..."
                  className="bg-white/5 backdrop-blur-xl border-white/10 min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Politique de confidentialité (texte complémentaire)</Label>
                <Textarea
                  value={legalTexts.politique_confidentialite}
                  onChange={(e) => setLegalTexts({...legalTexts, politique_confidentialite: e.target.value})}
                  placeholder="Ajoutez des informations complémentaires pour votre politique de confidentialité..."
                  className="bg-white/5 backdrop-blur-xl border-white/10 min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Politique de cookies (texte complémentaire)</Label>
                <Textarea
                  value={legalTexts.politique_cookies}
                  onChange={(e) => setLegalTexts({...legalTexts, politique_cookies: e.target.value})}
                  placeholder="Ajoutez des informations complémentaires pour votre politique de cookies..."
                  className="bg-white/5 backdrop-blur-xl border-white/10 min-h-[150px]"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveLegal}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white hover:text-white"
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
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                Intégrations
              </CardTitle>
              <CardDescription>
                Configurez vos clés API pour les services tiers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-white">Google Analytics 4 - ID de propriété</Label>
                <Input
                  value={integrations.ga4_id}
                  onChange={(e) => setIntegrations({...integrations, ga4_id: e.target.value})}
                  placeholder="G-XXXXXXXXXX"
                  className="bg-white/5 backdrop-blur-xl border-white/10"
                />
                <p className="text-xs text-white/60">
                  Ajoutez votre ID GA4 pour suivre les visites du site
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Resend - Clé API</Label>
                <Input
                  type="password"
                  value={integrations.resend_api_key}
                  onChange={(e) => setIntegrations({...integrations, resend_api_key: e.target.value})}
                  placeholder="re_xxxxxxxxxxxx"
                  className="bg-white/5 backdrop-blur-xl border-white/10"
                />
                <p className="text-xs text-white/60">
                  Pour l'envoi automatique des emails de notification
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Stripe - Clé API secrète</Label>
                <Input
                  type="password"
                  value={integrations.stripe_api_key}
                  onChange={(e) => setIntegrations({...integrations, stripe_api_key: e.target.value})}
                  placeholder="sk_xxxxxxxxxxxx"
                  className="bg-white/5 backdrop-blur-xl border-white/10"
                />
                <p className="text-xs text-white/60">
                  Pour la gestion des paiements en ligne
                </p>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveIntegrations}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white hover:text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data">
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                Gestion des données
              </CardTitle>
              <CardDescription>
                Gérez les données de test et de démonstration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {dataStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dataStats.leads || 0}</div>
                    <div className="text-sm text-blue-800">Leads</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dataStats.projects || 0}</div>
                    <div className="text-sm text-green-800">Projets</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{dataStats.invoices || 0}</div>
                    <div className="text-sm text-purple-800">Factures</div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div>
                    <h3 className="font-medium text-orange-800">Données de test - Leads</h3>
                    <p className="text-sm text-orange-600">Supprimer tous les leads de démonstration</p>
                  </div>
                  <Button
                    onClick={() => handleDeleteTestData('leads')}
                    disabled={deletingData}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    {deletingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div>
                    <h3 className="font-medium text-orange-800">Données de test - Projets</h3>
                    <p className="text-sm text-orange-600">Supprimer tous les projets de démonstration</p>
                  </div>
                  <Button
                    onClick={() => handleDeleteTestData('projects')}
                    disabled={deletingData}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    {deletingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div>
                    <h3 className="font-medium text-orange-800">Données de test - Factures</h3>
                    <p className="text-sm text-orange-600">Supprimer toutes les factures de démonstration</p>
                  </div>
                  <Button
                    onClick={() => handleDeleteTestData('invoices')}
                    disabled={deletingData}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    {deletingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h3 className="font-medium text-red-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Supprimer toutes les données de test
                    </h3>
                    <p className="text-sm text-red-600">⚠️ Action irréversible - Supprime toutes les données de démonstration</p>
                  </div>
                  <Button
                    onClick={handleClearAllTestData}
                    disabled={deletingData}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Tout supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
