import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { contactsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Available fields for mapping
const CONTACT_FIELDS = [
  { value: "ignore", label: "— Ignorer cette colonne —" },
  { value: "first_name", label: "Prénom" },
  { value: "last_name", label: "Nom" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
  { value: "company", label: "Entreprise" },
  { value: "city", label: "Ville" },
  { value: "project_type", label: "Type de projet" },
];

// Status options
const STATUS_OPTIONS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "prospect", label: "Prospect" },
  { value: "client", label: "Client" },
  { value: "vip", label: "VIP" },
  { value: "inactif", label: "Inactif" },
];

export default function ImportContactsDialog({ open, onOpenChange, onImportSuccess }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importOptions, setImportOptions] = useState({
    status: "nouveau",
    tags: "",
    updateExisting: false,
    identifierField: "email",
    subscribeEmail: false,
    subscribeSms: false,
  });
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Reset state when dialog closes
  const handleClose = () => {
    setStep(1);
    setFile(null);
    setParseResult(null);
    setMapping({});
    setImportOptions({
      status: "nouveau",
      tags: "",
      updateExisting: false,
      identifierField: "email",
      subscribeEmail: false,
      subscribeSms: false,
    });
    setImportResult(null);
    onOpenChange(false);
  };

  // Dropzone configuration
  const onDrop = useCallback(async (acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      const response = await contactsAPI.parseImportFile(uploadedFile);
      setParseResult(response.data);
      
      // Auto-detect mapping based on column names
      const autoMapping = {};
      response.data.columns.forEach((col) => {
        const colLower = col.toLowerCase().trim();
        if (colLower.includes("prénom") || colLower === "prenom" || colLower === "firstname" || colLower === "first_name") {
          autoMapping[col] = "first_name";
        } else if (colLower.includes("nom") || colLower === "lastname" || colLower === "last_name" || colLower === "name") {
          autoMapping[col] = "last_name";
        } else if (colLower.includes("email") || colLower.includes("mail") || colLower.includes("courriel")) {
          autoMapping[col] = "email";
        } else if (colLower.includes("tel") || colLower.includes("phone") || colLower.includes("mobile") || colLower.includes("portable")) {
          autoMapping[col] = "phone";
        } else if (colLower.includes("entreprise") || colLower.includes("société") || colLower.includes("company") || colLower.includes("societe")) {
          autoMapping[col] = "company";
        } else if (colLower.includes("ville") || colLower.includes("city")) {
          autoMapping[col] = "city";
        } else {
          autoMapping[col] = "ignore";
        }
      });
      setMapping(autoMapping);
      
      toast.success(`Fichier analysé: ${response.data.total_rows} lignes détectées`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'analyse du fichier");
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxSize: 100 * 1024 * 1024, // 100 MB
    multiple: false,
  });

  // Handle mapping change
  const handleMappingChange = (column, field) => {
    setMapping((prev) => ({ ...prev, [column]: field }));
  };

  // Execute import
  const handleImport = async () => {
    setLoading(true);
    try {
      const options = {
        mapping,
        status: importOptions.status,
        tags: importOptions.tags.split(",").map((t) => t.trim()).filter(Boolean),
        updateExisting: importOptions.updateExisting,
        identifierField: importOptions.identifierField,
        subscribeEmail: importOptions.subscribeEmail,
        subscribeSms: importOptions.subscribeSms,
      };

      const response = await contactsAPI.executeImport(file, options);
      setImportResult(response.data);
      setStep(4); // Success step
      
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  // Check if mapping is valid (at least email or phone mapped)
  const isMappingValid = () => {
    const mappedFields = Object.values(mapping);
    return mappedFields.includes("email") || mappedFields.includes("phone");
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((s, index) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step >= s
                ? "bg-[#CE0202] text-white"
                : "bg-[#E5E5E5] text-[#666666]"
            }`}
          >
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          <span
            className={`ml-2 text-sm hidden sm:inline ${
              step >= s ? "text-[#1A1A1A] font-medium" : "text-[#666666]"
            }`}
          >
            {s === 1 ? "Fichier" : s === 2 ? "Correspondance" : "Options"}
          </span>
          {index < 2 && (
            <ChevronRight className="w-4 h-4 mx-2 sm:mx-4 text-[#E5E5E5]" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#CE0202]" />
            Importer des contacts
          </DialogTitle>
        </DialogHeader>

        {step < 4 && <StepIndicator />}

        <AnimatePresence mode="wait">
          {/* Step 1: File Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-[#CE0202] bg-[#CE0202]/5"
                    : file
                    ? "border-green-500 bg-green-50"
                    : "border-[#E5E5E5] hover:border-[#CE0202] hover:bg-[#F8F8F8]"
                }`}
              >
                <input {...getInputProps()} />
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-[#CE0202] animate-spin" />
                    <p className="text-[#666666]">Analyse du fichier en cours...</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[#1A1A1A] font-medium">{file.name}</p>
                      <p className="text-[#666666] text-sm">
                        {parseResult?.total_rows} lignes détectées
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setParseResult(null);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-[#F8F8F8] rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-[#CE0202]" />
                    </div>
                    <div>
                      <p className="text-[#1A1A1A] font-medium">
                        {isDragActive
                          ? "Déposez le fichier ici"
                          : "Glissez-déposez votre fichier ici"}
                      </p>
                      <p className="text-[#666666] text-sm mt-1">
                        ou cliquez pour sélectionner
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-[#F8F8F8] text-[#666666]">
                      .csv, .xls, .xlsx (100 MB max)
                    </Badge>
                  </div>
                )}
              </div>

              {parseResult && parseResult.preview.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">
                    Aperçu des données :
                  </h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F8F8F8]">
                          {parseResult.columns.map((col) => (
                            <TableHead key={col} className="text-xs text-[#666666]">
                              {col}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseResult.preview.slice(0, 3).map((row, i) => (
                          <TableRow key={i}>
                            {parseResult.columns.map((col) => (
                              <TableCell key={col} className="text-xs">
                                {row[col]?.substring(0, 30) || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!file || !parseResult}
                  className="bg-[#CE0202] hover:bg-[#CE0202]/90"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-[#666666] text-sm">
                Associez les colonnes de votre fichier aux champs de contact. Au moins
                l'email ou le téléphone doit être mappé.
              </p>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8F8F8]">
                      <TableHead className="text-[#666666]">Colonne du fichier</TableHead>
                      <TableHead className="text-[#666666]">Exemple</TableHead>
                      <TableHead className="text-[#666666]">Champ cible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult?.columns.map((col) => (
                      <TableRow key={col}>
                        <TableCell className="font-medium text-[#1A1A1A]">
                          {col}
                        </TableCell>
                        <TableCell className="text-[#666666] text-sm">
                          {parseResult.preview[0]?.[col]?.substring(0, 25) || "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping[col] || "ignore"}
                            onValueChange={(value) => handleMappingChange(col, value)}
                          >
                            <SelectTrigger className="w-full bg-white border-[#E5E5E5]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {CONTACT_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!isMappingValid() && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Vous devez mapper au moins l'email ou le téléphone.
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!isMappingValid()}
                  className="bg-[#CE0202] hover:bg-[#CE0202]/90"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Import Options */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">
                  Ajouter des mots-clés / tags aux contacts importés
                </Label>
                <Input
                  placeholder="Ex: import-2024, salon, web (séparés par des virgules)"
                  value={importOptions.tags}
                  onChange={(e) =>
                    setImportOptions({ ...importOptions, tags: e.target.value })
                  }
                  className="bg-[#F8F8F8] border-[#E5E5E5]"
                />
              </div>

              {/* Status */}
              <div className="space-y-3">
                <Label className="text-[#1A1A1A]">Statut du contact</Label>
                <RadioGroup
                  value={importOptions.status}
                  onValueChange={(value) =>
                    setImportOptions({ ...importOptions, status: value })
                  }
                  className="flex flex-wrap gap-4"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="text-[#666666] cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Update existing */}
              <div className="space-y-3">
                <Label className="text-[#1A1A1A]">
                  Mettre à jour les contacts existants ?
                </Label>
                <p className="text-xs text-[#666666]">
                  Basé sur l'identifiant : {importOptions.identifierField === "email" ? "Email" : "Téléphone"}
                </p>
                <RadioGroup
                  value={importOptions.updateExisting ? "yes" : "no"}
                  onValueChange={(value) =>
                    setImportOptions({ ...importOptions, updateExisting: value === "yes" })
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="update-yes" />
                    <Label htmlFor="update-yes" className="text-[#666666] cursor-pointer">
                      Oui, mettre à jour
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="update-no" />
                    <Label htmlFor="update-no" className="text-[#666666] cursor-pointer">
                      Non, ignorer les doublons
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Identifier field */}
              <div className="space-y-3">
                <Label className="text-[#1A1A1A]">Identifiant principal</Label>
                <RadioGroup
                  value={importOptions.identifierField}
                  onValueChange={(value) =>
                    setImportOptions({ ...importOptions, identifierField: value })
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="id-email" />
                    <Label htmlFor="id-email" className="text-[#666666] cursor-pointer">
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="id-phone" />
                    <Label htmlFor="id-phone" className="text-[#666666] cursor-pointer">
                      Téléphone
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Subscriptions */}
              <div className="space-y-3">
                <Label className="text-[#1A1A1A]">Inscrire ces contacts aux campagnes :</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="subscribe-email"
                      checked={importOptions.subscribeEmail}
                      onCheckedChange={(checked) =>
                        setImportOptions({ ...importOptions, subscribeEmail: checked })
                      }
                    />
                    <Label htmlFor="subscribe-email" className="text-[#666666] cursor-pointer">
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="subscribe-sms"
                      checked={importOptions.subscribeSms}
                      onCheckedChange={(checked) =>
                        setImportOptions({ ...importOptions, subscribeSms: checked })
                      }
                    />
                    <Label htmlFor="subscribe-sms" className="text-[#666666] cursor-pointer">
                      SMS
                    </Label>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-[#F8F8F8] rounded-lg">
                <h4 className="font-medium text-[#1A1A1A] mb-2">Résumé de l'import</h4>
                <ul className="text-sm text-[#666666] space-y-1">
                  <li>• {parseResult?.total_rows} lignes à traiter</li>
                  <li>• Statut : {STATUS_OPTIONS.find((s) => s.value === importOptions.status)?.label}</li>
                  <li>• Mise à jour : {importOptions.updateExisting ? "Oui" : "Non"}</li>
                  {importOptions.tags && <li>• Tags : {importOptions.tags}</li>}
                </ul>
              </div>

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading}
                  className="bg-[#CE0202] hover:bg-[#CE0202]/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      Lancer l'import
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === 4 && importResult && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-[#1A1A1A]">Import terminé !</h3>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-xs text-green-700">Importés</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  <p className="text-xs text-blue-700">Mis à jour</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  <p className="text-xs text-gray-700">Ignorés</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg text-left max-h-40 overflow-y-auto">
                  <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Erreurs ({importResult.errors.length})
                  </h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={handleClose} className="bg-[#CE0202] hover:bg-[#CE0202]/90 mt-4">
                Fermer
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
