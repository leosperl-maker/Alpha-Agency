import { useState, useCallback } from "react";
import {
  Plus, X, GripVertical, ChevronUp, ChevronDown, Image, Video, Type,
  Heading1, Heading2, Heading3, Heading4, Quote, List, ListOrdered,
  Columns, Divide, BarChart3, SlidersHorizontal, MousePointer2, Code,
  Palette, ChevronRight, Trash2, Settings2, Music, Link2, AlignLeft,
  AlignCenter, AlignRight, Bold, Italic, ImagePlus, Upload, Loader2, Copy
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "./ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "./ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from "./ui/dropdown-menu";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "./ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { uploadAPI } from "../lib/api";
import { toast } from "sonner";

// Block type definitions
const BLOCK_TYPES = {
  // Text & Headings
  text: { label: "Texte", icon: Type, category: "text" },
  heading: { label: "Titre", icon: Heading1, category: "text" },
  list: { label: "Liste", icon: List, category: "text" },
  quote: { label: "Citation", icon: Quote, category: "text" },
  
  // Media
  image: { label: "Image", icon: Image, category: "media" },
  gallery: { label: "Galerie", icon: ImagePlus, category: "media" },
  video: { label: "Vidéo", icon: Video, category: "media" },
  audio: { label: "Audio", icon: Music, category: "media" },
  pdf: { label: "Document PDF", icon: Link2, category: "media" },
  beforeAfter: { label: "Avant/Après", icon: SlidersHorizontal, category: "media" },
  
  // Layout
  columns: { label: "Colonnes", icon: Columns, category: "layout" },
  section: { label: "Section couleur", icon: Palette, category: "layout" },
  divider: { label: "Séparateur", icon: Divide, category: "layout" },
  spacer: { label: "Espace", icon: ChevronRight, category: "layout" },
  
  // Interactive
  stats: { label: "Statistiques", icon: BarChart3, category: "interactive" },
  cta: { label: "Bouton CTA", icon: MousePointer2, category: "interactive" },
  accordion: { label: "Accordéon", icon: ChevronRight, category: "interactive" },
  
  // Code
  code: { label: "Code", icon: Code, category: "code" },
};

// Default block content
const getDefaultBlockContent = (type) => {
  switch (type) {
    case 'text':
      return { content: '', alignment: 'left' };
    case 'heading':
      return { content: '', level: 2, alignment: 'left' };
    case 'list':
      return { items: [''], ordered: false };
    case 'quote':
      return { content: '', author: '', role: '' };
    case 'image':
      return { url: '', caption: '', alignment: 'center', size: 'large', rounded: false, shadow: false };
    case 'gallery':
      return { images: [], layout: 'grid', columns: 3, gap: 'md', rounded: true };
    case 'video':
      return { url: '', type: 'youtube', caption: '', autoplay: false };
    case 'audio':
      return { url: '', title: '' };
    case 'pdf':
      return { url: '', title: '', downloadable: true, preview: true };
    case 'beforeAfter':
      return { before: '', after: '', caption: '' };
    case 'columns':
      return { columns: 2, gap: 'md', content: [{ blocks: [] }, { blocks: [] }] };
    case 'section':
      return { backgroundColor: '#F8F8F8', textColor: '#1A1A1A', padding: 'lg', blocks: [] };
    case 'divider':
      return { style: 'line', color: '#E5E5E5' };
    case 'spacer':
      return { height: 'md' };
    case 'stats':
      return { items: [{ value: '100+', label: 'Projets' }], columns: 4 };
    case 'cta':
      return { text: 'En savoir plus', url: '#', style: 'primary', alignment: 'center' };
    case 'accordion':
      return { items: [{ title: 'Question', content: 'Réponse' }] };
    case 'code':
      return { code: '', language: 'javascript' };
    default:
      return {};
  }
};

// Block Editors
const TextBlockEditor = ({ block, onUpdate }) => (
  <div className="space-y-3">
    <Textarea
      value={block.content || ''}
      onChange={(e) => onUpdate({ ...block, content: e.target.value })}
      placeholder="Votre texte ici... Utilisez **gras**, *italique*, [lien](url)"
      className="min-h-32 bg-white/5 border-white/10 font-mono text-sm"
    />
    <div className="flex gap-2">
      <Select value={block.alignment || 'left'} onValueChange={(v) => onUpdate({ ...block, alignment: v })}>
        <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
          <SelectItem value="left" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"><AlignLeft className="w-4 h-4 inline mr-2" />Gauche</SelectItem>
          <SelectItem value="center" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"><AlignCenter className="w-4 h-4 inline mr-2" />Centre</SelectItem>
          <SelectItem value="right" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"><AlignRight className="w-4 h-4 inline mr-2" />Droite</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

const HeadingBlockEditor = ({ block, onUpdate }) => (
  <div className="space-y-3">
    <div className="flex gap-2">
      <Select value={String(block.level || 2)} onValueChange={(v) => onUpdate({ ...block, level: parseInt(v) })}>
        <SelectTrigger className="w-20 bg-white/5"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
          <SelectItem value="1" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">H1</SelectItem>
          <SelectItem value="2" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">H2</SelectItem>
          <SelectItem value="3" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">H3</SelectItem>
          <SelectItem value="4" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">H4</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={block.content || ''}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
        placeholder="Titre de la section"
        className={`flex-1 bg-white/5 ${
          block.level === 1 ? 'text-2xl font-black' :
          block.level === 2 ? 'text-xl font-bold' :
          block.level === 3 ? 'text-lg font-semibold' : 'text-base font-medium'
        }`}
      />
    </div>
    <Select value={block.alignment || 'left'} onValueChange={(v) => onUpdate({ ...block, alignment: v })}>
      <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
        <SelectItem value="left" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Gauche</SelectItem>
        <SelectItem value="center" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Centre</SelectItem>
        <SelectItem value="right" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Droite</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const ListBlockEditor = ({ block, onUpdate }) => {
  const items = block.items || [''];
  
  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    onUpdate({ ...block, items: newItems });
  };
  
  const addItem = () => onUpdate({ ...block, items: [...items, ''] });
  const removeItem = (index) => {
    if (items.length > 1) {
      onUpdate({ ...block, items: items.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant={block.ordered ? "outline" : "default"}
          size="sm"
          onClick={() => onUpdate({ ...block, ordered: false })}
          className={!block.ordered ? "bg-indigo-600" : ""}
        >
          <List className="w-4 h-4 mr-1" /> À puces
        </Button>
        <Button
          variant={block.ordered ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ ...block, ordered: true })}
          className={block.ordered ? "bg-indigo-600" : ""}
        >
          <ListOrdered className="w-4 h-4 mr-1" /> Numérotée
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-6 text-center text-white/60 pt-2">
              {block.ordered ? `${i + 1}.` : '•'}
            </span>
            <Input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`Élément ${i + 1}`}
              className="flex-1 bg-white/5"
            />
            <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="w-4 h-4 mr-1" /> Ajouter
      </Button>
    </div>
  );
};

const QuoteBlockEditor = ({ block, onUpdate }) => (
  <div className="space-y-3 bg-white/5 p-4 rounded-lg border-l-4 border-[#CE0202]">
    <Textarea
      value={block.content || ''}
      onChange={(e) => onUpdate({ ...block, content: e.target.value })}
      placeholder="Votre citation ici..."
      className="min-h-20 bg-white/5 border-white/10 italic"
    />
    <div className="grid grid-cols-2 gap-2">
      <Input
        value={block.author || ''}
        onChange={(e) => onUpdate({ ...block, author: e.target.value })}
        placeholder="Auteur"
        className="bg-white/5"
      />
      <Input
        value={block.role || ''}
        onChange={(e) => onUpdate({ ...block, role: e.target.value })}
        placeholder="Fonction/Entreprise"
        className="bg-white/5"
      />
    </div>
  </div>
);

const ImageBlockEditor = ({ block, onUpdate }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      try {
        const res = await uploadAPI.image(e.target.files[0]);
        onUpdate({ ...block, url: res.data.url });
        toast.success("Image uploadée");
      } catch (err) {
        toast.error("Erreur upload");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={block.url || ''}
          onChange={(e) => onUpdate({ ...block, url: e.target.value })}
          placeholder="URL de l'image"
          className="flex-1 bg-white/5"
        />
        <label className="cursor-pointer">
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <span>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload
            </span>
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>
      
      {block.url && (
        <div className={`relative ${block.alignment === 'center' ? 'mx-auto' : block.alignment === 'right' ? 'ml-auto' : ''}`}
             style={{ maxWidth: block.size === 'small' ? '40%' : block.size === 'medium' ? '60%' : block.size === 'large' ? '80%' : '100%' }}>
          <img
            src={block.url}
            alt=""
            className={`w-full object-cover ${block.rounded ? 'rounded-xl' : ''} ${block.shadow ? 'shadow-xl' : ''}`}
          />
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        <Select value={block.size || 'large'} onValueChange={(v) => onUpdate({ ...block, size: v })}>
          <SelectTrigger className="w-28 bg-white/5"><SelectValue placeholder="Taille" /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
            <SelectItem value="small" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Petit</SelectItem>
            <SelectItem value="medium" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Moyen</SelectItem>
            <SelectItem value="large" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Grand</SelectItem>
            <SelectItem value="full" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Plein</SelectItem>
          </SelectContent>
        </Select>
        <Select value={block.alignment || 'center'} onValueChange={(v) => onUpdate({ ...block, alignment: v })}>
          <SelectTrigger className="w-28 bg-white/5"><SelectValue placeholder="Align" /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
            <SelectItem value="left" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Gauche</SelectItem>
            <SelectItem value="center" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Centre</SelectItem>
            <SelectItem value="right" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Droite</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={block.rounded ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ ...block, rounded: !block.rounded })}
          className={block.rounded ? "bg-indigo-600" : ""}
        >
          Arrondis
        </Button>
        <Button
          variant={block.shadow ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ ...block, shadow: !block.shadow })}
          className={block.shadow ? "bg-indigo-600" : ""}
        >
          Ombre
        </Button>
      </div>
      
      <Input
        value={block.caption || ''}
        onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
        placeholder="Légende (optionnel)"
        className="bg-white/5"
      />
    </div>
  );
};

const GalleryBlockEditor = ({ block, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const images = block.images || [];

  const handleUpload = async (e) => {
    if (e.target.files?.length) {
      setUploading(true);
      try {
        const newImages = [...images];
        for (const file of e.target.files) {
          const res = await uploadAPI.image(file);
          newImages.push({ url: res.data.url, caption: '' });
        }
        onUpdate({ ...block, images: newImages });
        toast.success("Images uploadées");
      } catch (err) {
        toast.error("Erreur upload");
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = (index) => {
    onUpdate({ ...block, images: images.filter((_, i) => i !== index) });
  };

  const updateCaption = (index, caption) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], caption };
    onUpdate({ ...block, images: newImages });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={block.layout || 'grid'} onValueChange={(v) => onUpdate({ ...block, layout: v })}>
          <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
            <SelectItem value="grid" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Grille</SelectItem>
            <SelectItem value="masonry" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Masonry</SelectItem>
            <SelectItem value="carousel" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Carrousel</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(block.columns || 3)} onValueChange={(v) => onUpdate({ ...block, columns: parseInt(v) })}>
          <SelectTrigger className="w-28 bg-white/5"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
            <SelectItem value="2" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">2 colonnes</SelectItem>
            <SelectItem value="3" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">3 colonnes</SelectItem>
            <SelectItem value="4" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">4 colonnes</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={block.rounded ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ ...block, rounded: !block.rounded })}
          className={block.rounded ? "bg-indigo-600" : ""}
        >
          Arrondis
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {images.map((img, i) => (
          <div key={i} className="relative group">
            <img src={img.url} alt="" className={`w-full h-24 object-cover ${block.rounded ? 'rounded-lg' : ''}`} />
            <Button
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => removeImage(i)}
            >
              <X className="w-3 h-3" />
            </Button>
            <Input
              value={img.caption || ''}
              onChange={(e) => updateCaption(i, e.target.value)}
              placeholder="Légende"
              className="mt-1 text-xs bg-white/5 h-7"
            />
          </div>
        ))}
        <label className={`h-24 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-[#CE0202] ${block.rounded ? 'rounded-lg' : ''}`}>
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> : <Plus className="w-6 h-6 text-white/60" />}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
};

const VideoBlockEditor = ({ block, onUpdate }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 100MB)");
        return;
      }
      setUploading(true);
      try {
        const res = await uploadAPI.video(file);
        onUpdate({ ...block, url: res.data.url, type: 'direct' });
        toast.success("Vidéo uploadée");
      } catch (err) {
        toast.error("Erreur upload vidéo");
      } finally {
        setUploading(false);
      }
    }
  };

  const getEmbedUrl = () => {
    if (!block.url) return null;
    if (block.type === 'youtube') {
      const videoId = block.url.includes('v=') 
        ? block.url.split('v=')[1]?.split('&')[0] 
        : block.url.split('/').pop()?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (block.type === 'vimeo') {
      const videoId = block.url.split('/').pop()?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Select value={block.type || 'youtube'} onValueChange={(v) => onUpdate({ ...block, type: v, url: '' })}>
          <SelectTrigger className="w-40 bg-white/5"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
            <SelectItem value="youtube" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">YouTube</SelectItem>
            <SelectItem value="vimeo" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Vimeo</SelectItem>
            <SelectItem value="direct" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Fichier uploadé</SelectItem>
          </SelectContent>
        </Select>
        {block.type === 'direct' && (
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" disabled={uploading} asChild>
              <span>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Upload...' : 'Uploader vidéo'}
              </span>
            </Button>
            <input type="file" accept="video/*" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
      
      {block.type !== 'direct' && (
        <Input
          value={block.url || ''}
          onChange={(e) => onUpdate({ ...block, url: e.target.value })}
          placeholder={block.type === 'youtube' ? 'URL YouTube (ex: https://youtu.be/xxx)' : 'URL Vimeo'}
          className="bg-white/5"
        />
      )}
      
      {block.url && (
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          {block.type === 'direct' ? (
            <video src={block.url} controls className="w-full h-full" />
          ) : (
            <iframe
              src={getEmbedUrl()}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          )}
        </div>
      )}
      
      <Input
        value={block.caption || ''}
        onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
        placeholder="Légende (optionnel)"
        className="bg-white/5"
      />
    </div>
  );
};

const PDFBlockEditor = ({ block, onUpdate }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 50MB)");
        return;
      }
      setUploading(true);
      try {
        const res = await uploadAPI.file(file);
        onUpdate({ ...block, url: res.data.url, title: file.name });
        toast.success("PDF uploadé");
      } catch (err) {
        toast.error("Erreur upload PDF");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <label className="cursor-pointer flex-1">
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${block.url ? 'border-green-500 bg-green-50' : 'border-white/10 hover:border-indigo-500'}`}>
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span>Upload en cours...</span>
              </div>
            ) : block.url ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Link2 className="w-6 h-6" />
                <span className="font-medium">{block.title || 'Document PDF'}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/60">
                <Upload className="w-8 h-8" />
                <span>Cliquez pour uploader un PDF</span>
                <span className="text-xs">(max 50MB)</span>
              </div>
            )}
          </div>
          <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleUpload} />
        </label>
      </div>
      
      {block.url && (
        <>
          <Input
            value={block.title || ''}
            onChange={(e) => onUpdate({ ...block, title: e.target.value })}
            placeholder="Titre du document"
            className="bg-white/5"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={block.preview !== false} 
                onChange={(e) => onUpdate({ ...block, preview: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Afficher aperçu</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={block.downloadable !== false} 
                onChange={(e) => onUpdate({ ...block, downloadable: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Téléchargeable</span>
            </label>
          </div>
          {block.preview !== false && (
            <div className="border rounded-lg overflow-hidden bg-white/10" style={{height: '400px'}}>
              <iframe src={block.url} className="w-full h-full" title={block.title || 'PDF'} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const BeforeAfterBlockEditor = ({ block, onUpdate }) => {
  const [uploading, setUploading] = useState(null);

  const handleUpload = async (e, field) => {
    if (e.target.files?.[0]) {
      setUploading(field);
      try {
        const res = await uploadAPI.image(e.target.files[0]);
        onUpdate({ ...block, [field]: res.data.url });
        toast.success("Image uploadée");
      } catch (err) {
        toast.error("Erreur upload");
      } finally {
        setUploading(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-medium">AVANT</Label>
          <div className="relative h-32 bg-white/5 rounded-lg border-2 border-dashed border-white/10 overflow-hidden">
            {block.before ? (
              <img src={block.before} alt="Avant" className="w-full h-full object-cover" />
            ) : (
              <label className="flex items-center justify-center w-full h-full cursor-pointer">
                {uploading === 'before' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6 text-white/60" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'before')} />
              </label>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-medium">APRÈS</Label>
          <div className="relative h-32 bg-white/5 rounded-lg border-2 border-dashed border-white/10 overflow-hidden">
            {block.after ? (
              <img src={block.after} alt="Après" className="w-full h-full object-cover" />
            ) : (
              <label className="flex items-center justify-center w-full h-full cursor-pointer">
                {uploading === 'after' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6 text-white/60" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'after')} />
              </label>
            )}
          </div>
        </div>
      </div>
      <Input
        value={block.caption || ''}
        onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
        placeholder="Légende (optionnel)"
        className="bg-white/5"
      />
    </div>
  );
};

const StatsBlockEditor = ({ block, onUpdate }) => {
  const items = block.items || [{ value: '', label: '' }];

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ ...block, items: newItems });
  };

  const addItem = () => onUpdate({ ...block, items: [...items, { value: '', label: '' }] });
  const removeItem = (index) => {
    if (items.length > 1) {
      onUpdate({ ...block, items: items.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={String(block.columns || 4)} onValueChange={(v) => onUpdate({ ...block, columns: parseInt(v) })}>
          <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
            <SelectItem value="2" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">2 colonnes</SelectItem>
            <SelectItem value="3" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">3 colonnes</SelectItem>
            <SelectItem value="4" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">4 colonnes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start bg-white/5 p-3 rounded-lg">
            <div className="flex-1 space-y-2">
              <Input
                value={item.value || ''}
                onChange={(e) => updateItem(i, 'value', e.target.value)}
                placeholder="100+"
                className="bg-white/5 text-xl font-bold text-center"
              />
              <Input
                value={item.label || ''}
                onChange={(e) => updateItem(i, 'label', e.target.value)}
                placeholder="Projets réalisés"
                className="bg-white/5 text-sm text-center"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="w-4 h-4 mr-1" /> Ajouter une stat
      </Button>
    </div>
  );
};

const CTABlockEditor = ({ block, onUpdate }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <Input
        value={block.text || ''}
        onChange={(e) => onUpdate({ ...block, text: e.target.value })}
        placeholder="Texte du bouton"
        className="bg-white/5"
      />
      <Input
        value={block.url || ''}
        onChange={(e) => onUpdate({ ...block, url: e.target.value })}
        placeholder="URL du lien"
        className="bg-white/5"
      />
    </div>
    <div className="flex gap-2 flex-wrap">
      <Select value={block.style || 'primary'} onValueChange={(v) => onUpdate({ ...block, style: v })}>
        <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
          <SelectItem value="primary" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Principal</SelectItem>
          <SelectItem value="outline" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Contour</SelectItem>
          <SelectItem value="ghost" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Transparent</SelectItem>
        </SelectContent>
      </Select>
      <Select value={block.alignment || 'center'} onValueChange={(v) => onUpdate({ ...block, alignment: v })}>
        <SelectTrigger className="w-28 bg-white/5"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
          <SelectItem value="left" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Gauche</SelectItem>
          <SelectItem value="center" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Centre</SelectItem>
          <SelectItem value="right" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Droite</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className={`flex ${block.alignment === 'center' ? 'justify-center' : block.alignment === 'right' ? 'justify-end' : ''}`}>
      <Button
        variant={block.style === 'outline' ? 'outline' : block.style === 'ghost' ? 'ghost' : 'default'}
        className={block.style === 'primary' ? 'bg-indigo-600 hover:bg-[#B00202]' : ''}
      >
        {block.text || 'Bouton'}
      </Button>
    </div>
  </div>
);

const DividerBlockEditor = ({ block, onUpdate }) => (
  <div className="space-y-3">
    <div className="flex gap-2">
      <Select value={block.style || 'line'} onValueChange={(v) => onUpdate({ ...block, style: v })}>
        <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
          <SelectItem value="line" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Ligne</SelectItem>
          <SelectItem value="dashed" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Tirets</SelectItem>
          <SelectItem value="dotted" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Points</SelectItem>
          <SelectItem value="gradient" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Dégradé</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="color"
        value={block.color || '#E5E5E5'}
        onChange={(e) => onUpdate({ ...block, color: e.target.value })}
        className="w-12 h-9 p-1 bg-white/5"
      />
    </div>
    <div className={`border-t-2 ${
      block.style === 'dashed' ? 'border-dashed' :
      block.style === 'dotted' ? 'border-dotted' : ''
    }`} style={{ borderColor: block.color || '#E5E5E5' }} />
  </div>
);

const SpacerBlockEditor = ({ block, onUpdate }) => (
  <div className="flex gap-2 items-center">
    <Label>Hauteur :</Label>
    <Select value={block.height || 'md'} onValueChange={(v) => onUpdate({ ...block, height: v })}>
      <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
        <SelectItem value="sm" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Petit (16px)</SelectItem>
        <SelectItem value="md" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Moyen (32px)</SelectItem>
        <SelectItem value="lg" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Grand (64px)</SelectItem>
        <SelectItem value="xl" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Très grand (96px)</SelectItem>
      </SelectContent>
    </Select>
    <div className="flex-1 bg-white/5 rounded" style={{
      height: block.height === 'sm' ? 16 : block.height === 'lg' ? 64 : block.height === 'xl' ? 96 : 32
    }} />
  </div>
);

const AccordionBlockEditor = ({ block, onUpdate }) => {
  const items = block.items || [{ title: '', content: '' }];

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ ...block, items: newItems });
  };

  const addItem = () => onUpdate({ ...block, items: [...items, { title: '', content: '' }] });
  const removeItem = (index) => {
    if (items.length > 1) {
      onUpdate({ ...block, items: items.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="bg-white/5 p-3 rounded-lg space-y-2">
          <div className="flex gap-2">
            <Input
              value={item.title || ''}
              onChange={(e) => updateItem(i, 'title', e.target.value)}
              placeholder="Titre de la section"
              className="flex-1 bg-white/5 font-medium"
            />
            <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            value={item.content || ''}
            onChange={(e) => updateItem(i, 'content', e.target.value)}
            placeholder="Contenu de la section"
            className="bg-white/5 min-h-16"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="w-4 h-4 mr-1" /> Ajouter une section
      </Button>
    </div>
  );
};

const CodeBlockEditor = ({ block, onUpdate }) => (
  <div className="space-y-3">
    <Select value={block.language || 'javascript'} onValueChange={(v) => onUpdate({ ...block, language: v })}>
      <SelectTrigger className="w-40 bg-white/5"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
        <SelectItem value="javascript" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">JavaScript</SelectItem>
        <SelectItem value="html" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">HTML</SelectItem>
        <SelectItem value="css" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">CSS</SelectItem>
        <SelectItem value="python" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Python</SelectItem>
        <SelectItem value="bash" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Bash</SelectItem>
      </SelectContent>
    </Select>
    <Textarea
      value={block.code || ''}
      onChange={(e) => onUpdate({ ...block, code: e.target.value })}
      placeholder="// Votre code ici"
      className="font-mono text-sm bg-[#1A1A1A] text-green-400 min-h-32 border-none"
    />
  </div>
);

const SectionBlockEditor = ({ block, onUpdate }) => (
  <div className="space-y-3">
    <div className="flex gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Label className="text-sm">Fond :</Label>
        <Input
          type="color"
          value={block.backgroundColor || '#F8F8F8'}
          onChange={(e) => onUpdate({ ...block, backgroundColor: e.target.value })}
          className="w-12 h-8 p-1 bg-white/5"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-sm">Texte :</Label>
        <Input
          type="color"
          value={block.textColor || '#1A1A1A'}
          onChange={(e) => onUpdate({ ...block, textColor: e.target.value })}
          className="w-12 h-8 p-1 bg-white/5"
        />
      </div>
      <Select value={block.padding || 'lg'} onValueChange={(v) => onUpdate({ ...block, padding: v })}>
        <SelectTrigger className="w-32 bg-white/5"><SelectValue placeholder="Padding" /></SelectTrigger>
        <SelectContent className="bg-[#1a1a2e] border-white/10 z-[9999]">
          <SelectItem value="sm" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Petit</SelectItem>
          <SelectItem value="md" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Moyen</SelectItem>
          <SelectItem value="lg" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">Grand</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: block.backgroundColor || '#F8F8F8', color: block.textColor || '#1A1A1A' }}
    >
      <p className="text-sm opacity-60">Aperçu de la section colorée</p>
    </div>
  </div>
);

// Single Block Editor Component
const BlockEditor = ({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const blockType = BLOCK_TYPES[block.type];
  const Icon = blockType?.icon || Type;

  const renderEditor = () => {
    switch (block.type) {
      case 'text': return <TextBlockEditor block={block} onUpdate={onUpdate} />;
      case 'heading': return <HeadingBlockEditor block={block} onUpdate={onUpdate} />;
      case 'list': return <ListBlockEditor block={block} onUpdate={onUpdate} />;
      case 'quote': return <QuoteBlockEditor block={block} onUpdate={onUpdate} />;
      case 'image': return <ImageBlockEditor block={block} onUpdate={onUpdate} />;
      case 'gallery': return <GalleryBlockEditor block={block} onUpdate={onUpdate} />;
      case 'video': return <VideoBlockEditor block={block} onUpdate={onUpdate} />;
      case 'pdf': return <PDFBlockEditor block={block} onUpdate={onUpdate} />;
      case 'beforeAfter': return <BeforeAfterBlockEditor block={block} onUpdate={onUpdate} />;
      case 'stats': return <StatsBlockEditor block={block} onUpdate={onUpdate} />;
      case 'cta': return <CTABlockEditor block={block} onUpdate={onUpdate} />;
      case 'divider': return <DividerBlockEditor block={block} onUpdate={onUpdate} />;
      case 'spacer': return <SpacerBlockEditor block={block} onUpdate={onUpdate} />;
      case 'accordion': return <AccordionBlockEditor block={block} onUpdate={onUpdate} />;
      case 'code': return <CodeBlockEditor block={block} onUpdate={onUpdate} />;
      case 'section': return <SectionBlockEditor block={block} onUpdate={onUpdate} />;
      default: return <p className="text-white/60">Type de bloc inconnu: {block.type}</p>;
    }
  };

  return (
    <div className="group relative bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-[#CE0202]/30 transition-colors">
      {/* Block Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-[#999999] cursor-grab" />
          <Badge variant="outline" className="text-xs">
            <Icon className="w-3 h-3 mr-1" />
            {blockType?.label || block.type}
          </Badge>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={isFirst} className="h-7 w-7 p-0">
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast} className="h-7 w-7 p-0">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Block Content */}
      <div className="p-4">
        {renderEditor()}
      </div>
    </div>
  );
};

// Add Block Button Component
const AddBlockButton = ({ onAdd }) => {
  const categories = {
    text: { label: "Texte", types: ['text', 'heading', 'list', 'quote'] },
    media: { label: "Média", types: ['image', 'gallery', 'video', 'beforeAfter'] },
    layout: { label: "Mise en page", types: ['divider', 'spacer', 'section'] },
    interactive: { label: "Interactif", types: ['stats', 'cta', 'accordion'] },
    code: { label: "Code", types: ['code'] },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-2 border-white/10 hover:border-indigo-500 py-6">
          <Plus className="w-5 h-5 mr-2" />
          Ajouter un bloc
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-[#1a1a2e] border-white/10 z-[9999]" align="center">
        {Object.entries(categories).map(([catKey, cat]) => (
          <div key={catKey}>
            <DropdownMenuLabel className="text-xs uppercase text-white/50">{cat.label}</DropdownMenuLabel>
            {cat.types.map((type) => {
              const blockType = BLOCK_TYPES[type];
              const Icon = blockType.icon;
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => onAdd(type)}
                  className="cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <Icon className="w-4 h-4 mr-2 text-white/70" />
                  <span className="text-white">{blockType.label}</span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="bg-white/10" />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Main Advanced Block Editor Component
const AdvancedBlockEditor = ({ blocks = [], onChange, className = "" }) => {
  const addBlock = (type, insertIndex = null) => {
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      ...getDefaultBlockContent(type)
    };
    
    if (insertIndex !== null) {
      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex + 1, 0, newBlock);
      onChange(newBlocks);
    } else {
      onChange([...blocks, newBlock]);
    }
  };

  const updateBlock = (index, updatedBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  };

  const deleteBlock = (index) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-lg border-2 border-dashed border-white/10">
          <Type className="w-12 h-12 mx-auto text-[#999999] mb-3" />
          <p className="text-white/60 mb-4">Aucun contenu pour le moment</p>
          <AddBlockButton onAdd={(type) => addBlock(type)} />
        </div>
      ) : (
        <>
          {blocks.map((block, index) => (
            <div key={block.id || index}>
              <BlockEditor
                block={block}
                index={index}
                onUpdate={(updated) => updateBlock(index, updated)}
                onDelete={() => deleteBlock(index)}
                onMoveUp={() => moveBlock(index, 'up')}
                onMoveDown={() => moveBlock(index, 'down')}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
              />
            </div>
          ))}
          <AddBlockButton onAdd={(type) => addBlock(type)} />
        </>
      )}
    </div>
  );
};

export default AdvancedBlockEditor;
export { BLOCK_TYPES, getDefaultBlockContent };
