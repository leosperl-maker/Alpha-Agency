import { useState, useCallback } from "react";
import {
  Type, Image, Square, Columns, Minus, Link2, Quote,
  GripVertical, Trash2, Plus, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Palette, Settings2, Eye, Code, Save, Undo, Redo
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "../lib/utils";

// Block types available
const BLOCK_TYPES = [
  { type: "header", icon: Type, label: "En-tête", description: "Logo et titre principal" },
  { type: "text", icon: Type, label: "Texte", description: "Paragraphe de texte" },
  { type: "title", icon: Type, label: "Titre", description: "Titre H2 ou H3" },
  { type: "image", icon: Image, label: "Image", description: "Image avec légende" },
  { type: "button", icon: Square, label: "Bouton CTA", description: "Bouton d'appel à l'action" },
  { type: "divider", icon: Minus, label: "Séparateur", description: "Ligne de séparation" },
  { type: "columns", icon: Columns, label: "2 Colonnes", description: "Contenu sur 2 colonnes" },
  { type: "spacer", icon: Square, label: "Espace", description: "Espace vertical" },
  { type: "social", icon: Link2, label: "Réseaux sociaux", description: "Liens sociaux" },
  { type: "footer", icon: Quote, label: "Pied de page", description: "Informations légales" },
];

// Default block content
const getDefaultContent = (type) => {
  switch (type) {
    case "header":
      return {
        logoUrl: "{{logo_url}}",
        title: "Titre de l'email",
        subtitle: "Sous-titre optionnel",
        bgColor: "#CE0202",
        textColor: "#ffffff"
      };
    case "text":
      return {
        content: "Votre texte ici. Utilisez {{first_name}} pour personnaliser.",
        align: "left",
        fontSize: "16px",
        color: "#333333"
      };
    case "title":
      return {
        content: "Titre de section",
        level: "h2",
        align: "left",
        color: "#1a1a1a"
      };
    case "image":
      return {
        src: "https://via.placeholder.com/600x300",
        alt: "Description de l'image",
        width: "100%",
        align: "center",
        caption: ""
      };
    case "button":
      return {
        text: "Cliquez ici",
        url: "{{cta_url}}",
        bgColor: "#CE0202",
        textColor: "#ffffff",
        align: "center",
        borderRadius: "6px",
        padding: "14px 30px"
      };
    case "divider":
      return {
        color: "#eeeeee",
        width: "100%",
        height: "1px",
        margin: "20px 0"
      };
    case "columns":
      return {
        left: { type: "text", content: "Colonne gauche" },
        right: { type: "text", content: "Colonne droite" },
        gap: "20px"
      };
    case "spacer":
      return { height: "30px" };
    case "social":
      return {
        facebook: "#",
        instagram: "#",
        linkedin: "#",
        twitter: "",
        align: "center"
      };
    case "footer":
      return {
        companyName: "{{company_name}}",
        address: "{{company_address}}",
        unsubscribeUrl: "{{unsubscribe_url}}",
        bgColor: "#1a1a1a",
        textColor: "#999999"
      };
    default:
      return {};
  }
};

// Individual block editor component
const BlockEditor = ({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isEditing, setIsEditing] = useState(false);

  const updateContent = (key, value) => {
    onChange({ ...block, content: { ...block.content, [key]: value } });
  };

  const renderPreview = () => {
    const { content } = block;
    
    switch (block.type) {
      case "header":
        return (
          <div 
            className="p-6 text-center rounded-t-lg"
            style={{ backgroundColor: content.bgColor, color: content.textColor }}
          >
            {content.logoUrl && (
              <div className="mb-3 text-xs opacity-70">[Logo: {content.logoUrl}]</div>
            )}
            <h1 className="text-2xl font-bold">{content.title}</h1>
            {content.subtitle && <p className="mt-2 opacity-90">{content.subtitle}</p>}
          </div>
        );
      
      case "text":
        return (
          <p 
            className="p-4"
            style={{ 
              textAlign: content.align, 
              fontSize: content.fontSize,
              color: content.color 
            }}
          >
            {content.content}
          </p>
        );
      
      case "title":
        const TitleTag = content.level === "h2" ? "h2" : "h3";
        return (
          <TitleTag 
            className={cn("p-4 font-bold", content.level === "h2" ? "text-xl" : "text-lg")}
            style={{ textAlign: content.align, color: content.color }}
          >
            {content.content}
          </TitleTag>
        );
      
      case "image":
        return (
          <div className="p-4" style={{ textAlign: content.align }}>
            <img 
              src={content.src} 
              alt={content.alt}
              className="inline-block max-w-full rounded"
              style={{ width: content.width }}
            />
            {content.caption && (
              <p className="mt-2 text-sm text-gray-500">{content.caption}</p>
            )}
          </div>
        );
      
      case "button":
        return (
          <div className="p-4" style={{ textAlign: content.align }}>
            <a
              href={content.url}
              className="inline-block font-semibold no-underline"
              style={{
                backgroundColor: content.bgColor,
                color: content.textColor,
                padding: content.padding,
                borderRadius: content.borderRadius
              }}
            >
              {content.text}
            </a>
          </div>
        );
      
      case "divider":
        return (
          <div style={{ margin: content.margin }}>
            <hr style={{ 
              backgroundColor: content.color, 
              height: content.height,
              border: "none",
              width: content.width 
            }} />
          </div>
        );
      
      case "spacer":
        return <div style={{ height: content.height }} />;
      
      case "social":
        return (
          <div className="p-4" style={{ textAlign: content.align }}>
            <div className="inline-flex gap-4">
              {content.facebook && <span className="text-blue-600">[Facebook]</span>}
              {content.instagram && <span className="text-pink-600">[Instagram]</span>}
              {content.linkedin && <span className="text-blue-700">[LinkedIn]</span>}
              {content.twitter && <span className="text-sky-500">[Twitter]</span>}
            </div>
          </div>
        );
      
      case "footer":
        return (
          <div 
            className="p-6 text-center text-sm rounded-b-lg"
            style={{ backgroundColor: content.bgColor, color: content.textColor }}
          >
            <p>© {new Date().getFullYear()} {content.companyName}</p>
            <p className="mt-1">{content.address}</p>
            <a href={content.unsubscribeUrl} className="text-[#CE0202] mt-2 inline-block">
              Se désabonner
            </a>
          </div>
        );
      
      default:
        return <div className="p-4 text-gray-400">Bloc inconnu</div>;
    }
  };

  const renderEditor = () => {
    const { content } = block;
    
    switch (block.type) {
      case "header":
        return (
          <div className="space-y-3">
            <div>
              <Label>URL du logo</Label>
              <Input value={content.logoUrl} onChange={(e) => updateContent("logoUrl", e.target.value)} />
            </div>
            <div>
              <Label>Titre</Label>
              <Input value={content.title} onChange={(e) => updateContent("title", e.target.value)} />
            </div>
            <div>
              <Label>Sous-titre</Label>
              <Input value={content.subtitle} onChange={(e) => updateContent("subtitle", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Couleur fond</Label>
                <div className="flex gap-2">
                  <Input type="color" value={content.bgColor} onChange={(e) => updateContent("bgColor", e.target.value)} className="w-12 h-10 p-1" />
                  <Input value={content.bgColor} onChange={(e) => updateContent("bgColor", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Couleur texte</Label>
                <div className="flex gap-2">
                  <Input type="color" value={content.textColor} onChange={(e) => updateContent("textColor", e.target.value)} className="w-12 h-10 p-1" />
                  <Input value={content.textColor} onChange={(e) => updateContent("textColor", e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        );
      
      case "text":
        return (
          <div className="space-y-3">
            <div>
              <Label>Contenu</Label>
              <Textarea 
                value={content.content} 
                onChange={(e) => updateContent("content", e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Alignement</Label>
                <Select value={content.align} onValueChange={(v) => updateContent("align", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Taille</Label>
                <Select value={content.fontSize} onValueChange={(v) => updateContent("fontSize", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14px">Petit</SelectItem>
                    <SelectItem value="16px">Normal</SelectItem>
                    <SelectItem value="18px">Grand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Couleur</Label>
                <div className="flex gap-1">
                  <Input type="color" value={content.color} onChange={(e) => updateContent("color", e.target.value)} className="w-10 h-10 p-1" />
                </div>
              </div>
            </div>
          </div>
        );
      
      case "title":
        return (
          <div className="space-y-3">
            <div>
              <Label>Texte du titre</Label>
              <Input value={content.content} onChange={(e) => updateContent("content", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Niveau</Label>
                <Select value={content.level} onValueChange={(v) => updateContent("level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h2">H2 (Grand)</SelectItem>
                    <SelectItem value="h3">H3 (Moyen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alignement</Label>
                <Select value={content.align} onValueChange={(v) => updateContent("align", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Couleur</Label>
                <Input type="color" value={content.color} onChange={(e) => updateContent("color", e.target.value)} className="w-full h-10 p-1" />
              </div>
            </div>
          </div>
        );
      
      case "image":
        return (
          <div className="space-y-3">
            <div>
              <Label>URL de l'image</Label>
              <Input value={content.src} onChange={(e) => updateContent("src", e.target.value)} />
            </div>
            <div>
              <Label>Texte alternatif</Label>
              <Input value={content.alt} onChange={(e) => updateContent("alt", e.target.value)} />
            </div>
            <div>
              <Label>Légende (optionnel)</Label>
              <Input value={content.caption} onChange={(e) => updateContent("caption", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Largeur</Label>
                <Select value={content.width} onValueChange={(v) => updateContent("width", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100%">Pleine largeur</SelectItem>
                    <SelectItem value="75%">75%</SelectItem>
                    <SelectItem value="50%">50%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alignement</Label>
                <Select value={content.align} onValueChange={(v) => updateContent("align", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      
      case "button":
        return (
          <div className="space-y-3">
            <div>
              <Label>Texte du bouton</Label>
              <Input value={content.text} onChange={(e) => updateContent("text", e.target.value)} />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={content.url} onChange={(e) => updateContent("url", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Couleur fond</Label>
                <Input type="color" value={content.bgColor} onChange={(e) => updateContent("bgColor", e.target.value)} className="w-full h-10 p-1" />
              </div>
              <div>
                <Label>Couleur texte</Label>
                <Input type="color" value={content.textColor} onChange={(e) => updateContent("textColor", e.target.value)} className="w-full h-10 p-1" />
              </div>
              <div>
                <Label>Alignement</Label>
                <Select value={content.align} onValueChange={(v) => updateContent("align", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      
      case "spacer":
        return (
          <div>
            <Label>Hauteur</Label>
            <Select value={content.height} onValueChange={(v) => updateContent("height", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10px">Petit (10px)</SelectItem>
                <SelectItem value="20px">Moyen (20px)</SelectItem>
                <SelectItem value="30px">Grand (30px)</SelectItem>
                <SelectItem value="50px">Très grand (50px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      
      case "footer":
        return (
          <div className="space-y-3">
            <div>
              <Label>Nom de l'entreprise</Label>
              <Input value={content.companyName} onChange={(e) => updateContent("companyName", e.target.value)} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={content.address} onChange={(e) => updateContent("address", e.target.value)} />
            </div>
            <div>
              <Label>URL de désinscription</Label>
              <Input value={content.unsubscribeUrl} onChange={(e) => updateContent("unsubscribeUrl", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Couleur fond</Label>
                <Input type="color" value={content.bgColor} onChange={(e) => updateContent("bgColor", e.target.value)} className="w-full h-10 p-1" />
              </div>
              <div>
                <Label>Couleur texte</Label>
                <Input type="color" value={content.textColor} onChange={(e) => updateContent("textColor", e.target.value)} className="w-full h-10 p-1" />
              </div>
            </div>
          </div>
        );
      
      default:
        return <p className="text-gray-400">Configuration non disponible</p>;
    }
  };

  return (
    <div className={cn(
      "group relative border rounded-lg transition-all",
      isEditing ? "border-[#CE0202] ring-2 ring-[#CE0202]/20" : "border-gray-200 hover:border-gray-300"
    )}>
      {/* Toolbar */}
      <div className={cn(
        "absolute -top-3 left-2 flex items-center gap-1 bg-white px-2 py-1 rounded border shadow-sm transition-opacity",
        "opacity-0 group-hover:opacity-100",
        isEditing && "opacity-100"
      )}>
        <span className="text-xs font-medium text-gray-500 mr-2">
          {BLOCK_TYPES.find(b => b.type === block.type)?.label}
        </span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isFirst} onClick={onMoveUp}>
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isLast} onClick={onMoveDown}>
          <ChevronDown className="w-3 h-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Settings2 className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="cursor-pointer" onClick={() => setIsEditing(true)}>
        {renderPreview()}
      </div>

      {/* Editor Panel */}
      {isEditing && (
        <div className="border-t bg-gray-50 p-4">
          {renderEditor()}
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => setIsEditing(false)}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Email Editor Component
const EmailEditor = ({ initialBlocks = [], onChange, onExport }) => {
  const [blocks, setBlocks] = useState(initialBlocks.length > 0 ? initialBlocks : [
    { id: "1", type: "header", content: getDefaultContent("header") },
    { id: "2", type: "text", content: getDefaultContent("text") },
    { id: "3", type: "button", content: getDefaultContent("button") },
    { id: "4", type: "footer", content: getDefaultContent("footer") },
  ]);
  const [viewMode, setViewMode] = useState("edit"); // edit, preview, code

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type)
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id, updatedBlock) => {
    setBlocks(blocks.map(b => b.id === id ? updatedBlock : b));
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (id, direction) => {
    const index = blocks.findIndex(b => b.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    ) return;
    
    const newBlocks = [...blocks];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  // Generate HTML from blocks
  const generateHTML = useCallback(() => {
    const renderBlock = (block) => {
      const { content } = block;
      
      switch (block.type) {
        case "header":
          return `
            <div style="background: ${content.bgColor}; padding: 40px 20px; text-align: center;">
              ${content.logoUrl ? `<img src="${content.logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 15px;">` : ""}
              <h1 style="color: ${content.textColor}; font-size: 28px; margin: 0;">${content.title}</h1>
              ${content.subtitle ? `<p style="color: ${content.textColor}; opacity: 0.9; margin-top: 10px;">${content.subtitle}</p>` : ""}
            </div>`;
        
        case "text":
          return `
            <div style="padding: 20px;">
              <p style="font-size: ${content.fontSize}; color: ${content.color}; text-align: ${content.align}; line-height: 1.6; margin: 0;">
                ${content.content}
              </p>
            </div>`;
        
        case "title":
          const tag = content.level === "h2" ? "h2" : "h3";
          const fontSize = content.level === "h2" ? "24px" : "20px";
          return `
            <div style="padding: 20px;">
              <${tag} style="font-size: ${fontSize}; color: ${content.color}; text-align: ${content.align}; margin: 0;">
                ${content.content}
              </${tag}>
            </div>`;
        
        case "image":
          return `
            <div style="padding: 20px; text-align: ${content.align};">
              <img src="${content.src}" alt="${content.alt}" style="max-width: 100%; width: ${content.width}; border-radius: 8px;">
              ${content.caption ? `<p style="font-size: 14px; color: #666; margin-top: 10px;">${content.caption}</p>` : ""}
            </div>`;
        
        case "button":
          return `
            <div style="padding: 20px; text-align: ${content.align};">
              <a href="${content.url}" style="display: inline-block; background: ${content.bgColor}; color: ${content.textColor}; padding: ${content.padding}; border-radius: ${content.borderRadius}; text-decoration: none; font-weight: bold;">
                ${content.text}
              </a>
            </div>`;
        
        case "divider":
          return `
            <div style="margin: ${content.margin};">
              <hr style="background: ${content.color}; height: ${content.height}; border: none; width: ${content.width};">
            </div>`;
        
        case "spacer":
          return `<div style="height: ${content.height};"></div>`;
        
        case "social":
          return `
            <div style="padding: 20px; text-align: ${content.align};">
              ${content.facebook ? `<a href="${content.facebook}" style="margin: 0 10px; color: #1877f2;">Facebook</a>` : ""}
              ${content.instagram ? `<a href="${content.instagram}" style="margin: 0 10px; color: #e4405f;">Instagram</a>` : ""}
              ${content.linkedin ? `<a href="${content.linkedin}" style="margin: 0 10px; color: #0a66c2;">LinkedIn</a>` : ""}
              ${content.twitter ? `<a href="${content.twitter}" style="margin: 0 10px; color: #1da1f2;">Twitter</a>` : ""}
            </div>`;
        
        case "footer":
          return `
            <div style="background: ${content.bgColor}; color: ${content.textColor}; padding: 25px 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${content.companyName}</p>
              <p style="margin: 5px 0 0;">${content.address}</p>
              <p style="margin: 10px 0 0;"><a href="${content.unsubscribeUrl}" style="color: #CE0202;">Se désabonner</a></p>
            </div>`;
        
        default:
          return "";
      }
    };

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  </style>
</head>
<body>
  <div class="container">
    ${blocks.map(renderBlock).join("\n")}
  </div>
</body>
</html>`;
  }, [blocks]);

  const handleExport = () => {
    const html = generateHTML();
    if (onExport) {
      onExport(html, blocks);
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar - Block Types */}
      <div className="w-64 flex-shrink-0 bg-gray-50 rounded-lg p-4 border">
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Blocs disponibles</h3>
        <div className="space-y-2">
          {BLOCK_TYPES.map((blockType) => (
            <button
              key={blockType.type}
              onClick={() => addBlock(blockType.type)}
              className="w-full flex items-center gap-3 p-3 bg-white border rounded-lg hover:border-[#CE0202] hover:bg-[#CE0202]/5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded bg-gray-100 group-hover:bg-[#CE0202]/10 flex items-center justify-center">
                <blockType.icon className="w-4 h-4 text-gray-600 group-hover:text-[#CE0202]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">{blockType.label}</p>
                <p className="text-xs text-gray-500">{blockType.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 p-3 bg-white border rounded-lg">
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="text-xs px-3 h-7">
                  <Settings2 className="w-3 h-3 mr-1" />
                  Éditer
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs px-3 h-7">
                  <Eye className="w-3 h-3 mr-1" />
                  Aperçu
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs px-3 h-7">
                  <Code className="w-3 h-3 mr-1" />
                  HTML
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{blocks.length} blocs</span>
            <Button onClick={handleExport} className="bg-[#CE0202] hover:bg-[#B00202]">
              <Save className="w-4 h-4 mr-2" />
              Utiliser ce design
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-4">
          {viewMode === "edit" && (
            <div className="max-w-[620px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
              {blocks.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Ajoutez des blocs depuis le panneau de gauche</p>
                </div>
              ) : (
                <div className="divide-y">
                  {blocks.map((block, index) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onChange={(updated) => updateBlock(block.id, updated)}
                      onDelete={() => deleteBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, "up")}
                      onMoveDown={() => moveBlock(block.id, "down")}
                      isFirst={index === 0}
                      isLast={index === blocks.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === "preview" && (
            <div className="max-w-[620px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
              <iframe
                srcDoc={generateHTML()}
                className="w-full h-[600px] border-0"
                title="Email Preview"
              />
            </div>
          )}

          {viewMode === "code" && (
            <div className="max-w-4xl mx-auto">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
                <code>{generateHTML()}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailEditor;
