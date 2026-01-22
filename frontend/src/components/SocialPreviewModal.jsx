import React from 'react';
import { 
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  ThumbsUp, Share2, MessageSquare, Globe, Play,
  Music, Home, Search, PlusSquare, User,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';

// Instagram Preview
const InstagramPreview = ({ post, mediaUrl }) => {
  const caption = post.caption || '';
  const truncatedCaption = caption.length > 125 ? caption.substring(0, 125) + '... plus' : caption;
  
  return (
    <div className="bg-black rounded-xl overflow-hidden max-w-[375px] mx-auto border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">alphagency.gp</p>
            <p className="text-white/50 text-xs">Guadeloupe</p>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-white" />
      </div>
      
      {/* Image */}
      <div className="aspect-square bg-white/5 relative">
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <span className="text-4xl">📷</span>
          </div>
        )}
        {/* Carousel indicator */}
        {post.format_type === 'carrousel' && (
          <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded text-white text-xs">
            1/5
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6 text-white cursor-pointer hover:text-white/70" />
            <MessageCircle className="w-6 h-6 text-white cursor-pointer hover:text-white/70" />
            <Send className="w-6 h-6 text-white cursor-pointer hover:text-white/70" />
          </div>
          <Bookmark className="w-6 h-6 text-white cursor-pointer hover:text-white/70" />
        </div>
        
        {/* Likes */}
        <p className="text-white text-sm font-semibold mb-2">1 234 J'aime</p>
        
        {/* Caption */}
        <div className="text-sm">
          <span className="text-white font-semibold">alphagency.gp </span>
          <span className="text-white/90">{truncatedCaption}</span>
        </div>
        
        {/* Comments link */}
        <p className="text-white/50 text-sm mt-2">Voir les 42 commentaires</p>
        
        {/* Time */}
        <p className="text-white/40 text-xs mt-1">Il y a 2 heures</p>
      </div>
    </div>
  );
};

// Facebook Preview
const FacebookPreview = ({ post, mediaUrl }) => {
  const caption = post.caption || '';
  
  return (
    <div className="bg-[#242526] rounded-xl overflow-hidden max-w-[500px] mx-auto border border-white/10">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold">A</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Alpha Agency</p>
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <span>Il y a 2h</span>
              <span>·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-white/50" />
        </div>
        
        {/* Caption */}
        <p className="text-white/90 text-sm mt-3 whitespace-pre-wrap">{caption}</p>
      </div>
      
      {/* Image */}
      <div className="aspect-video bg-white/5 relative">
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <span className="text-4xl">📷</span>
          </div>
        )}
      </div>
      
      {/* Reactions */}
      <div className="p-4">
        <div className="flex items-center justify-between text-white/50 text-sm pb-3 border-b border-white/10">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <span className="text-base">👍</span>
              <span className="text-base">❤️</span>
              <span className="text-base">😮</span>
            </div>
            <span>245</span>
          </div>
          <span>32 commentaires · 12 partages</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-around pt-2">
          <button className="flex items-center gap-2 text-white/70 hover:bg-white/5 px-4 py-2 rounded-lg">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm">J'aime</span>
          </button>
          <button className="flex items-center gap-2 text-white/70 hover:bg-white/5 px-4 py-2 rounded-lg">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">Commenter</span>
          </button>
          <button className="flex items-center gap-2 text-white/70 hover:bg-white/5 px-4 py-2 rounded-lg">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Partager</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// LinkedIn Preview
const LinkedInPreview = ({ post, mediaUrl }) => {
  const caption = post.caption || '';
  const truncatedCaption = caption.length > 200 ? caption.substring(0, 200) + '...' : caption;
  
  return (
    <div className="bg-white rounded-xl overflow-hidden max-w-[550px] mx-auto border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-semibold text-sm">Alpha Agency</p>
            <p className="text-gray-500 text-xs">1 234 abonnés</p>
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <span>2h</span>
              <span>·</span>
              <Globe className="w-3 h-3" />
            </p>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </div>
        
        {/* Caption */}
        <div className="mt-3 text-gray-800 text-sm whitespace-pre-wrap">
          {truncatedCaption}
          {caption.length > 200 && (
            <span className="text-blue-600 cursor-pointer ml-1">...voir plus</span>
          )}
        </div>
      </div>
      
      {/* Image */}
      <div className="aspect-video bg-gray-100 relative">
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-4xl">📷</span>
          </div>
        )}
      </div>
      
      {/* Reactions */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-gray-500 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-base">👍❤️🎉</span>
            <span>128</span>
          </div>
          <span>24 commentaires · 8 republications</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-around px-4 py-2 border-t border-gray-100">
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm font-medium">J'aime</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium">Commenter</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded">
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">Partager</span>
        </button>
      </div>
    </div>
  );
};

// TikTok Preview
const TikTokPreview = ({ post, mediaUrl }) => {
  const caption = post.caption || '';
  const truncatedCaption = caption.length > 80 ? caption.substring(0, 80) + '...' : caption;
  
  return (
    <div className="bg-black rounded-3xl overflow-hidden max-w-[280px] mx-auto border border-white/20 relative" style={{ height: '500px' }}>
      {/* Video background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80">
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <Play className="w-16 h-16 text-white/30" />
          </div>
        )}
      </div>
      
      {/* Right sidebar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden">
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
          </div>
          <div className="w-5 h-5 -mt-2 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">+</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <Heart className="w-8 h-8 text-white" fill="white" />
          <span className="text-white text-xs mt-1">24.5K</span>
        </div>
        
        <div className="flex flex-col items-center">
          <MessageCircle className="w-8 h-8 text-white" />
          <span className="text-white text-xs mt-1">892</span>
        </div>
        
        <div className="flex flex-col items-center">
          <Bookmark className="w-8 h-8 text-white" />
          <span className="text-white text-xs mt-1">1.2K</span>
        </div>
        
        <div className="flex flex-col items-center">
          <Share2 className="w-8 h-8 text-white" />
          <span className="text-white text-xs mt-1">456</span>
        </div>
        
        <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 animate-spin-slow overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
        </div>
      </div>
      
      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-16">
        <p className="text-white font-bold text-sm">@alphagency.gp</p>
        <p className="text-white text-xs mt-1 leading-relaxed">{truncatedCaption}</p>
        <div className="flex items-center gap-2 mt-2">
          <Music className="w-3 h-3 text-white" />
          <div className="overflow-hidden">
            <p className="text-white text-xs whitespace-nowrap animate-marquee">
              Son original - Alpha Agency 🎵
            </p>
          </div>
        </div>
      </div>
      
      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-black flex items-center justify-around px-4">
        <Home className="w-6 h-6 text-white" />
        <Search className="w-6 h-6 text-white/50" />
        <PlusSquare className="w-8 h-8 text-white" />
        <MessageSquare className="w-6 h-6 text-white/50" />
        <User className="w-6 h-6 text-white/50" />
      </div>
    </div>
  );
};

// YouTube Preview
const YouTubePreview = ({ post, mediaUrl }) => {
  const caption = post.caption || '';
  const description = caption.length > 150 ? caption.substring(0, 150) + '...' : caption;
  
  return (
    <div className="bg-[#0f0f0f] rounded-xl overflow-hidden max-w-[400px] mx-auto">
      {/* Video thumbnail */}
      <div className="aspect-video bg-gray-800 relative">
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-white/30" />
          </div>
        )}
        {/* Duration */}
        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
          3:24
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center">
          <span className="text-white text-sm font-bold">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm leading-tight line-clamp-2">
            {post.title || 'Titre de la vidéo'}
          </h3>
          <p className="text-white/50 text-xs mt-1">
            Alpha Agency · 12K vues · il y a 2 heures
          </p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-white/50 flex-shrink-0" />
      </div>
    </div>
  );
};

// Main Preview Modal Component
const SocialPreviewModal = ({ open, onOpenChange, post }) => {
  const mediaUrl = post?.medias?.[0]?.url || null;
  const networks = post?.networks || [];
  
  // Determine which tabs to show
  const availableNetworks = [
    { id: 'instagram', name: 'Instagram', component: InstagramPreview },
    { id: 'facebook', name: 'Facebook', component: FacebookPreview },
    { id: 'linkedin', name: 'LinkedIn', component: LinkedInPreview },
    { id: 'tiktok', name: 'TikTok', component: TikTokPreview },
    { id: 'youtube', name: 'YouTube', component: YouTubePreview }
  ].filter(n => networks.length === 0 || networks.includes(n.id));
  
  const defaultTab = availableNetworks[0]?.id || 'instagram';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            Prévisualisation - {post?.title || 'Post'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="bg-white/5 w-full justify-start flex-wrap h-auto gap-1 p-1">
            {availableNetworks.map(network => (
              <TabsTrigger 
                key={network.id} 
                value={network.id}
                className="data-[state=active]:bg-white/10"
              >
                {network.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <ScrollArea className="h-[60vh] mt-4">
            {availableNetworks.map(network => (
              <TabsContent key={network.id} value={network.id} className="mt-0 p-4">
                <network.component post={post} mediaUrl={mediaUrl} />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
        
        <div className="text-center text-white/40 text-xs mt-2">
          Aperçu simulé - Le rendu réel peut varier légèrement
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialPreviewModal;
