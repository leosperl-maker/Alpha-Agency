/**
 * Social Media Composer Pro
 * Multi-account post creation with platform previews
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, Send, Clock, Image, Video, FileText, X, Plus,
  Facebook, Instagram, Linkedin, Hash, MapPin, Link2, Smile,
  ChevronDown, ChevronUp, Upload, Trash2, GripVertical, Eye,
  Save, Copy, Sparkles, AlertTriangle, Check, Loader2, AtSign,
  Play, Film, Layers, FileImage, Globe, MoreHorizontal, Info,
  RefreshCw, Wand2, ExternalLink, ImagePlus, Type, Palette
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from './ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import {
  Popover, PopoverContent, PopoverTrigger
} from './ui/popover';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from './ui/tooltip';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from './ui/tabs';
import { toast } from 'sonner';
import api from '../lib/api';

// ==================== CONSTANTS ====================

const PLATFORMS = {
  facebook: { 
    name: 'Facebook', 
    icon: Facebook, 
    color: '#1877F2', 
    bgColor: 'bg-[#1877F2]',
    maxLength: 63206,
    maxHashtags: 30,
    maxMedia: 10,
    supports: ['feed', 'reel', 'story']
  },
  instagram: { 
    name: 'Instagram', 
    icon: Instagram, 
    color: '#E4405F', 
    bgColor: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
    maxLength: 2200,
    maxHashtags: 30,
    maxMedia: 10,
    supports: ['feed', 'reel', 'story', 'carousel']
  },
  linkedin: { 
    name: 'LinkedIn', 
    icon: Linkedin, 
    color: '#0A66C2', 
    bgColor: 'bg-[#0A66C2]',
    maxLength: 3000,
    maxHashtags: 5,
    maxMedia: 20,
    supports: ['feed']
  },
  tiktok: { 
    name: 'TikTok', 
    icon: Play, 
    color: '#000000', 
    bgColor: 'bg-black',
    maxLength: 2200,
    maxHashtags: 5,
    maxMedia: 1,
    supports: ['feed']
  },
};

const POST_TYPES = [
  { id: 'feed', label: 'Publication', icon: Image, description: 'Image ou vidéo classique' },
  { id: 'carousel', label: 'Carrousel', icon: FileImage, description: 'Plusieurs images/vidéos' },
  { id: 'reel', label: 'Reel/Short', icon: Film, description: 'Vidéo verticale courte' },
  { id: 'story', label: 'Story', icon: Layers, description: 'Contenu éphémère 24h' },
];

// ==================== PLATFORM ICON ====================

const PlatformIcon = ({ platform, className = "w-4 h-4", showBg = false }) => {
  const config = PLATFORMS[platform];
  if (!config) return <Globe className={className} />;
  const Icon = config.icon;
  
  if (showBg) {
    return (
      <div className={`${config.bgColor} p-1.5 rounded-lg`}>
        <Icon className={`${className} text-white`} />
      </div>
    );
  }
  
  return <Icon className={className} style={{ color: config.color }} />;
};

// ==================== MEDIA UPLOADER ====================

const MediaUploader = ({ medias, onChange, maxMedia = 10 }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (medias.length + files.length > maxMedia) {
      toast.error(`Maximum ${maxMedia} médias autorisés`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    const newMedias = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i) / totalFiles) * 100));
      
      try {
        // Upload to Cloudinary via our API
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('token');
        
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
        
        let response;
        try {
          response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/social/upload-media`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData,
            signal: controller.signal
          });
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Timeout - fichier trop volumineux ou connexion lente');
          }
          throw new Error('Erreur réseau - vérifiez votre connexion');
        }
        
        clearTimeout(timeoutId);
        
        // Parse response - handle network errors gracefully
        let result;
        try {
          const text = await response.text();
          console.log('Upload response status:', response.status);
          console.log('Upload response text:', text?.substring(0, 200));
          result = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('Parse error:', parseError);
          console.error('Response status was:', response.status);
          throw new Error(`Réponse serveur invalide (status: ${response.status})`);
        }
        
        if (!response.ok) {
          throw new Error(result.detail || `Erreur serveur (${response.status})`);
        }
        
        console.log('Upload success:', result.url);
        
        newMedias.push({
          id: Math.random().toString(36).substr(2, 9),
          url: result.url,  // Cloudinary URL
          type: result.type,
          name: file.name,
          cloudinary_public_id: result.public_id
        });
        
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Erreur upload ${file.name}: ${error.message}`);
      }
    }
    
    setUploadProgress(100);
    onChange([...medias, ...newMedias]);
    setUploading(false);
    setUploadProgress(0);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (id) => {
    onChange(medias.filter(m => m.id !== id));
  };

  const moveMedia = (fromIndex, toIndex) => {
    const newMedias = [...medias];
    const [removed] = newMedias.splice(fromIndex, 1);
    newMedias.splice(toIndex, 0, removed);
    onChange(newMedias);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Upload Progress */}
      {uploading && (
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Upload en cours... {uploadProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Media Grid */}
      {medias.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {medias.map((media, index) => (
            <div 
              key={media.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-white/5 group"
            >
              {media.type === 'video' ? (
                <video 
                  src={media.url} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={media.url} 
                  alt={media.name}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => removeMedia(media.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Index badge */}
              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
              
              {/* Type badge */}
              {media.type === 'video' && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  Vidéo
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Button */}
      <Button
        variant="outline"
        className="w-full border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 h-20"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || medias.length >= maxMedia}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <ImagePlus className="w-5 h-5 mr-2" />
        )}
        {medias.length === 0 ? 'Ajouter des médias' : `Ajouter (${medias.length}/${maxMedia})`}
      </Button>
    </div>
  );
};

// ==================== PLATFORM PREVIEW ====================

const PlatformPreview = ({ platform, content, medias, hashtags, account }) => {
  const config = PLATFORMS[platform];
  if (!config) return null;

  const fullContent = hashtags.length > 0 
    ? `${content}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
    : content;

  // Instagram Preview
  if (platform === 'instagram') {
    return (
      <div className="bg-white rounded-xl overflow-hidden max-w-[320px] mx-auto shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] p-0.5">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              {account?.profile_picture_url ? (
                <img src={account.profile_picture_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Instagram className="w-4 h-4 text-pink-500" />
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-black">{account?.username || 'username'}</p>
          </div>
          <MoreHorizontal className="w-5 h-5 text-black ml-auto" />
        </div>
        
        {/* Media */}
        <div className="aspect-square bg-gray-100">
          {medias.length > 0 ? (
            medias[0].type === 'video' ? (
              <video src={medias[0].url} className="w-full h-full object-cover" />
            ) : (
              <img src={medias[0].url} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Image className="w-12 h-12" />
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-4 p-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <svg className="w-6 h-6 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        
        {/* Likes */}
        <div className="px-3 pb-1">
          <p className="text-sm font-semibold text-black">1 234 J&apos;aime</p>
        </div>
        
        {/* Caption */}
        <div className="px-3 pb-3">
          <p className="text-sm text-black">
            <span className="font-semibold">{account?.username || 'username'}</span>{' '}
            <span className="whitespace-pre-wrap">{fullContent.substring(0, 150)}</span>
            {fullContent.length > 150 && <span className="text-gray-500">... plus</span>}
          </p>
        </div>
      </div>
    );
  }

  // Facebook Preview
  if (platform === 'facebook') {
    return (
      <div className="bg-white rounded-xl overflow-hidden max-w-[400px] mx-auto shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
            {account?.profile_picture_url ? (
              <img src={account.profile_picture_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <Facebook className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-black">{account?.display_name || 'Page Name'}</p>
            <p className="text-xs text-gray-500">Sponsorisé · 🌍</p>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-600 ml-auto" />
        </div>
        
        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-sm text-black whitespace-pre-wrap">
            {fullContent.substring(0, 200)}
            {fullContent.length > 200 && <span className="text-[#1877F2]">... Voir plus</span>}
          </p>
        </div>
        
        {/* Media */}
        {medias.length > 0 && (
          <div className="aspect-video bg-gray-100">
            {medias[0].type === 'video' ? (
              <video src={medias[0].url} className="w-full h-full object-cover" />
            ) : (
              <img src={medias[0].url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        )}
        
        {/* Reactions */}
        <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-500 border-b">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1">
              <span className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[8px]">👍</span>
              <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px]">❤️</span>
            </span>
            <span>234</span>
          </div>
          <div>12 commentaires · 5 partages</div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-around p-2 text-gray-600">
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg text-sm font-medium">
            👍 J&apos;aime
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg text-sm font-medium">
            💬 Commenter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg text-sm font-medium">
            ↗️ Partager
          </button>
        </div>
      </div>
    );
  }

  // LinkedIn Preview
  if (platform === 'linkedin') {
    return (
      <div className="bg-white rounded-xl overflow-hidden max-w-[400px] mx-auto shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center">
            {account?.profile_picture_url ? (
              <img src={account.profile_picture_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <Linkedin className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-black">{account?.display_name || 'Company'}</p>
            <p className="text-xs text-gray-500">1 234 abonnés</p>
            <p className="text-xs text-gray-500">Promu</p>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-600" />
        </div>
        
        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-sm text-black whitespace-pre-wrap">
            {fullContent.substring(0, 200)}
            {fullContent.length > 200 && <span className="text-[#0A66C2]">...voir plus</span>}
          </p>
        </div>
        
        {/* Media */}
        {medias.length > 0 && (
          <div className="aspect-video bg-gray-100">
            {medias[0].type === 'video' ? (
              <video src={medias[0].url} className="w-full h-full object-cover" />
            ) : (
              <img src={medias[0].url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        )}
        
        {/* Stats */}
        <div className="px-3 py-2 flex items-center gap-2 text-xs text-gray-500 border-b">
          <span>👍 💙 89</span>
          <span className="ml-auto">4 commentaires</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-around p-2 text-gray-600">
          <button className="flex items-center gap-1 px-3 py-2 hover:bg-gray-100 rounded-lg text-xs font-medium">
            👍 J&apos;aime
          </button>
          <button className="flex items-center gap-1 px-3 py-2 hover:bg-gray-100 rounded-lg text-xs font-medium">
            💬 Commenter
          </button>
          <button className="flex items-center gap-1 px-3 py-2 hover:bg-gray-100 rounded-lg text-xs font-medium">
            🔄 Republier
          </button>
          <button className="flex items-center gap-1 px-3 py-2 hover:bg-gray-100 rounded-lg text-xs font-medium">
            ✉️ Envoyer
          </button>
        </div>
      </div>
    );
  }

  // TikTok Preview
  if (platform === 'tiktok') {
    return (
      <div className="bg-black rounded-xl overflow-hidden max-w-[280px] mx-auto shadow-lg aspect-[9/16] relative">
        {/* Video Background */}
        <div className="absolute inset-0 bg-gray-900">
          {medias.length > 0 && medias[0].type === 'video' ? (
            <video src={medias[0].url} className="w-full h-full object-cover" />
          ) : medias.length > 0 ? (
            <img src={medias[0].url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-16 h-16 text-white/30" />
            </div>
          )}
        </div>
        
        {/* Right sidebar */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              ❤️
            </div>
            <span className="text-white text-xs">12.3K</span>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              💬
            </div>
            <span className="text-white text-xs">234</span>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              🔖
            </div>
            <span className="text-white text-xs">567</span>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              ↗️
            </div>
            <span className="text-white text-xs">89</span>
          </div>
        </div>
        
        {/* Bottom info */}
        <div className="absolute bottom-4 left-3 right-14">
          <p className="text-white font-semibold text-sm">@{account?.username || 'username'}</p>
          <p className="text-white text-xs mt-1 line-clamp-2">{content}</p>
          {hashtags.length > 0 && (
            <p className="text-white/80 text-xs mt-1">
              {hashtags.slice(0, 3).map(h => `#${h}`).join(' ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// ==================== MAIN COMPOSER COMPONENT ====================

const SocialComposer = ({ 
  open, 
  onOpenChange, 
  entities = [], 
  accounts = [],
  selectedEntity: initialEntity = null,
  selectedAccountIds: initialAccountIds = [],
  editingPost = null,
  onSuccess
}) => {
  // Form state
  const [selectedEntity, setSelectedEntity] = useState(initialEntity);
  const [selectedAccounts, setSelectedAccounts] = useState(initialAccountIds);
  const [postType, setPostType] = useState('feed');
  const [content, setContent] = useState('');
  const [medias, setMedias] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // UI state
  const [activePreviewPlatform, setActivePreviewPlatform] = useState('instagram');
  const [saving, setSaving] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [mobileTab, setMobileTab] = useState('content');  // For mobile responsive layout
  
  // Derived state
  const entityAccounts = selectedEntity 
    ? accounts.filter(a => a.entity_ids?.includes(selectedEntity.id))
    : [];
  
  const selectedAccountsData = accounts.filter(a => selectedAccounts.includes(a.id));
  const selectedPlatforms = [...new Set(selectedAccountsData.map(a => a.platform))];

  // Initialize from editing post
  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || '');
      setHashtags(editingPost.hashtags || []);
      setLinkUrl(editingPost.link_url || '');
      setLocation(editingPost.location || '');
      setPostType(editingPost.post_type || 'feed');
      setSelectedAccounts(editingPost.account_ids || []);
      
      if (editingPost.scheduled_at) {
        const dt = new Date(editingPost.scheduled_at);
        setScheduledDate(dt.toISOString().split('T')[0]);
        setScheduledTime(dt.toTimeString().slice(0, 5));
        setShowScheduler(true);
      }
      
      // Find entity
      if (editingPost.entity_id) {
        const entity = entities.find(e => e.id === editingPost.entity_id);
        setSelectedEntity(entity);
      }
    }
  }, [editingPost, entities]);

  // Update initial values when props change
  useEffect(() => {
    if (initialEntity && !editingPost) {
      setSelectedEntity(initialEntity);
    }
  }, [initialEntity, editingPost]);

  useEffect(() => {
    if (initialAccountIds.length > 0 && !editingPost) {
      setSelectedAccounts(initialAccountIds);
    }
  }, [initialAccountIds, editingPost]);

  // Handlers
  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag) => {
    setHashtags(hashtags.filter(h => h !== tag));
  };

  const toggleAccount = (accountId) => {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(selectedAccounts.filter(id => id !== accountId));
    } else {
      setSelectedAccounts([...selectedAccounts, accountId]);
    }
  };

  const selectAllAccounts = () => {
    setSelectedAccounts(entityAccounts.map(a => a.id));
  };

  const handleSave = async (asDraft = false) => {
    if (!selectedEntity) {
      toast.error('Sélectionnez une entité');
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error('Sélectionnez au moins un compte');
      return;
    }
    if (!content.trim() && medias.length === 0) {
      toast.error('Ajoutez du contenu ou des médias');
      return;
    }

    setSaving(true);

    try {
      const postData = {
        entity_id: selectedEntity.id,
        account_ids: selectedAccounts,
        post_type: postType,
        content: content,
        media_urls: medias.map(m => m.url),
        hashtags: hashtags,
        link_url: linkUrl || null,
        location: location || null,
        scheduled_at: showScheduler && scheduledDate && scheduledTime 
          ? `${scheduledDate}T${scheduledTime}:00` 
          : null,
        is_draft: asDraft
      };

      if (editingPost) {
        await api.put(`/social/posts/${editingPost.id}`, postData);
        toast.success('Post mis à jour');
      } else {
        await api.post('/social/posts', postData);
        // Message approprié selon le type de publication
        if (asDraft) {
          toast.success('Brouillon enregistré');
        } else if (scheduledDate && scheduledTime) {
          toast.success('Post programmé');
        } else {
          toast.success('Publication en cours...');
        }
      }

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setContent('');
      setMedias([]);
      setHashtags([]);
      setLinkUrl('');
      setLocation('');
      setScheduledDate('');
      setScheduledTime('');
      setShowScheduler(false);
      
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }

    setSaving(false);
  };

  // Character count
  const getCharacterLimit = () => {
    const limits = selectedPlatforms.map(p => PLATFORMS[p]?.maxLength || 5000);
    return Math.min(...limits);
  };

  const characterLimit = getCharacterLimit();
  const characterCount = content.length;
  const isOverLimit = characterCount > characterLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[100dvh] md:h-[90vh] bg-slate-900 border-white/10 p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Header with safe area support for PWA mode */}
        <div 
          className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-white/10 bg-slate-900"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}
        >
          {/* Close button - Explicit for mobile PWA */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="md:hidden text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 mr-2 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-white text-base md:text-lg truncate">
              {editingPost ? 'Modifier le post' : 'Créer un nouveau post'}
            </DialogTitle>
            <p className="text-white/50 text-xs md:text-sm mt-0.5">
              {selectedAccounts.length} compte{selectedAccounts.length > 1 ? 's' : ''} sélectionné{selectedAccounts.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 ml-2">
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="text-white border-white/20 px-2 md:px-4 text-xs md:text-sm"
              size="sm"
            >
              <Save className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Brouillon</span>
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={saving || (showScheduler && (!scheduledDate || !scheduledTime))}
              className="bg-indigo-600 hover:bg-indigo-700 px-2 md:px-4 text-xs md:text-sm"
              size="sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 md:mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 md:mr-1" />
              )}
              <span className="hidden md:inline">{showScheduler ? 'Programmer' : 'Publier maintenant'}</span>
              <span className="md:hidden">{showScheduler ? 'Prog.' : 'Publier'}</span>
            </Button>
          </div>
        </div>

        {/* Mobile Tab Navigation - Only visible on small screens */}
        <div className="md:hidden border-b border-white/10 bg-slate-950/50">
          <div className="flex">
            <button
              onClick={() => setMobileTab('accounts')}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                mobileTab === 'accounts' 
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' 
                  : 'text-white/60'
              }`}
            >
              Comptes
            </button>
            <button
              onClick={() => setMobileTab('content')}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                mobileTab === 'content' 
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' 
                  : 'text-white/60'
              }`}
            >
              Contenu
            </button>
          </div>
        </div>
        
        {/* Content - Responsive layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Account Selection - Hidden on mobile unless tab selected */}
          <div className={`${mobileTab === 'accounts' ? 'flex' : 'hidden'} md:flex w-full md:w-72 border-r border-white/10 flex-col`}>
            <div className="p-4 border-b border-white/10">
              <Label className="text-white/70 text-xs uppercase tracking-wide">Entité</Label>
              <Select 
                value={selectedEntity?.id || ''} 
                onValueChange={(id) => {
                  const entity = entities.find(e => e.id === id);
                  setSelectedEntity(entity);
                  setSelectedAccounts([]);
                }}
              >
                <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entity.color }} />
                        {entity.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-white/70 text-xs uppercase tracking-wide">Comptes</Label>
                {entityAccounts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllAccounts}
                    className="text-xs text-indigo-400 hover:text-indigo-300 h-auto py-1"
                  >
                    Tout sélectionner
                  </Button>
                )}
              </div>
              
              {entityAccounts.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun compte lié</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entityAccounts.map(account => (
                    <div
                      key={account.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                        ${selectedAccounts.includes(account.id) 
                          ? 'bg-indigo-500/20 border border-indigo-500/50' 
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      onClick={() => toggleAccount(account.id)}
                    >
                      <Checkbox 
                        checked={selectedAccounts.includes(account.id)}
                        className="border-white/30"
                      />
                      <div className="relative">
                        {account.profile_picture_url ? (
                          <img 
                            src={account.profile_picture_url} 
                            alt={account.display_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${PLATFORMS[account.platform]?.bgColor || 'bg-white/20'}`}>
                            <PlatformIcon platform={account.platform} className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border border-slate-900"
                          style={{ backgroundColor: PLATFORMS[account.platform]?.color }}
                        >
                          <PlatformIcon platform={account.platform} className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{account.display_name}</p>
                        <p className="text-white/50 text-xs truncate">@{account.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Post Type */}
            <div className="p-4 border-t border-white/10">
              <Label className="text-white/70 text-xs uppercase tracking-wide mb-2 block">Type de post</Label>
              <div className="grid grid-cols-2 gap-2">
                {POST_TYPES.map(type => (
                  <Button
                    key={type.id}
                    variant={postType === type.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPostType(type.id)}
                    className={postType === type.id 
                      ? 'bg-indigo-600' 
                      : 'border-white/20 text-white/70 hover:text-white'
                    }
                  >
                    <type.icon className="w-3 h-3 mr-1" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Center Panel - Content Editor - Hidden on mobile unless tab selected */}
          <div className={`${mobileTab === 'content' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden`}>
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white">Contenu</Label>
                    <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-white/50'}`}>
                      {characterCount} / {characterLimit}
                    </span>
                  </div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Qu'avez-vous à partager ?"
                    className="min-h-[150px] bg-white/5 border-white/10 text-white resize-none"
                  />
                  {isOverLimit && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Le texte dépasse la limite pour certaines plateformes
                    </p>
                  )}
                </div>
                
                {/* Media */}
                <div>
                  <Label className="text-white mb-2 block">Médias</Label>
                  <MediaUploader 
                    medias={medias} 
                    onChange={setMedias}
                    maxMedia={10}
                  />
                </div>
                
                {/* Hashtags */}
                <div>
                  <Label className="text-white mb-2 block">Hashtags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
                      placeholder="Ajouter un hashtag..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Button 
                      onClick={handleAddHashtag}
                      variant="outline"
                      className="border-white/20 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map(tag => (
                        <Badge 
                          key={tag}
                          variant="outline"
                          className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30"
                          onClick={() => handleRemoveHashtag(tag)}
                        >
                          #{tag}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Link & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">Lien</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="pl-9 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">Lieu</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Ajouter un lieu..."
                        className="pl-9 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Scheduling */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-400" />
                      <span className="text-white font-medium">Programmer</span>
                    </div>
                    <Switch
                      checked={showScheduler}
                      onCheckedChange={setShowScheduler}
                    />
                  </div>
                  
                  {showScheduler && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white/70 text-xs mb-1 block">Date</Label>
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <Label className="text-white/70 text-xs mb-1 block">Heure</Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
          
          {/* Right Panel - Previews - HIDDEN ON MOBILE */}
          <div className="hidden lg:flex w-96 border-l border-white/10 flex-col bg-slate-950/50">
            <div className="p-4 border-b border-white/10">
              <Label className="text-white/70 text-xs uppercase tracking-wide mb-2 block">Prévisualisation</Label>
              <div className="flex gap-1">
                {selectedPlatforms.length === 0 ? (
                  <p className="text-white/40 text-sm">Sélectionnez des comptes</p>
                ) : (
                  selectedPlatforms.map(platform => (
                    <Button
                      key={platform}
                      variant={activePreviewPlatform === platform ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActivePreviewPlatform(platform)}
                      className={activePreviewPlatform === platform ? 'bg-white/10' : 'text-white/60'}
                    >
                      <PlatformIcon platform={platform} className="w-4 h-4 mr-1" />
                      {PLATFORMS[platform]?.name}
                    </Button>
                  ))
                )}
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4">
                {selectedPlatforms.length > 0 ? (
                  <PlatformPreview
                    platform={activePreviewPlatform}
                    content={content}
                    medias={medias}
                    hashtags={hashtags}
                    account={selectedAccountsData.find(a => a.platform === activePreviewPlatform)}
                  />
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Sélectionnez des comptes pour voir la prévisualisation</p>
                  </div>
                )}
                
                {/* Warnings */}
                {selectedPlatforms.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {isOverLimit && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-red-400 text-sm font-medium">Texte trop long</p>
                          <p className="text-red-400/70 text-xs">
                            Le texte dépasse la limite de {characterLimit} caractères
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {medias.length === 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                        <div>
                          <p className="text-yellow-400 text-sm font-medium">Pas de média</p>
                          <p className="text-yellow-400/70 text-xs">
                            Les posts avec médias ont plus d&apos;engagement
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {hashtags.length > 30 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                        <div>
                          <p className="text-yellow-400 text-sm font-medium">Trop de hashtags</p>
                          <p className="text-yellow-400/70 text-xs">
                            Instagram limite à 30 hashtags par post
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialComposer;
