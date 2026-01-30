import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Instagram, Facebook, Twitter, Youtube, Linkedin, 
  MessageCircle, Send, Mail, Globe, ShoppingBag, Calendar,
  Phone, MapPin, Link, Download, Play, Music, Mic, BookOpen,
  ExternalLink, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';

// Icon mapping
const ICON_MAP = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
  website: Globe,
  shop: ShoppingBag,
  calendar: Calendar,
  phone: Phone,
  location: MapPin,
  link: Link,
  download: Download,
  play: Play,
  music: Music,
  podcast: Mic,
  blog: BookOpen
};

// Modern Social Icons as SVG components (like zaap.bio)
const ModernInstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const ModernFacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const ModernTikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const ModernTwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const ModernYouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const ModernLinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const ModernWhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Social icon colors
const SOCIAL_COLORS = {
  instagram: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  facebook: '#1877F2',
  twitter: '#000000',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  whatsapp: '#25D366',
  telegram: '#0088cc',
  tiktok: '#000000',
  snapchat: '#FFFC00',
  email: '#EA4335',
  website: '#6366f1'
};

// Recommended image dimensions for cards
const IMAGE_DIMENSIONS = {
  linkCard: { width: 1200, height: 630, ratio: '1.91:1', description: 'Format Open Graph, idéal pour les partages' },
  carouselCard: { width: 400, height: 500, ratio: '4:5', description: 'Format portrait pour carousel' },
  squareCard: { width: 600, height: 600, ratio: '1:1', description: 'Format carré' },
  profile: { width: 400, height: 400, ratio: '1:1', description: 'Photo de profil' }
};

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Carousel Component - Enhanced with 3 types: image, video, link_image
const CarouselSection = ({ items, colors, onItemClick }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative">
      {/* Scroll buttons - desktop only */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md items-center justify-center text-white hover:bg-black/80 transition-all shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md items-center justify-center text-white hover:bg-black/80 transition-all shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      
      {/* Carousel container */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        onScroll={checkScroll}
      >
        {items.map((item, index) => {
          // Determine media source (new format or legacy)
          const mediaUrl = item.media_url || item.image;
          const isVideo = item.type === 'video' || item.media_type === 'video';
          const isLinkImage = item.type === 'link_image';
          
          return (
            <div
              key={index}
              className="flex-shrink-0 snap-start group"
              style={{ width: isLinkImage ? '260px' : '200px' }}
            >
              {/* Link Image Card - zaap.bio style with button */}
              {isLinkImage ? (
                <div 
                  className="rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02] h-full"
                  style={{ 
                    backgroundColor: colors.card_bg || colors.button_bg || 'rgba(255,255,255,0.1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  {mediaUrl && (
                    <img 
                      src={mediaUrl} 
                      alt={item.title || ''} 
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    {item.title && (
                      <h3 className="font-bold text-base" style={{ color: colors.text || '#ffffff' }}>
                        {item.title}
                      </h3>
                    )}
                    {item.description && (
                      <p className="text-sm mt-1.5 opacity-70 line-clamp-2" style={{ color: colors.text || '#ffffff' }}>
                        {item.description}
                      </p>
                    )}
                    {item.url && (
                      <button
                        onClick={() => onItemClick({ url: item.url, id: item.id })}
                        className="mt-3 w-full py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
                        style={{ 
                          backgroundColor: colors.accent || '#6366f1',
                          color: colors.button_text || '#ffffff'
                        }}
                      >
                        {item.button_text || 'En Savoir +'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Image or Video Card */
                <button
                  onClick={() => item.url && onItemClick({ url: item.url, id: item.id })}
                  className="w-full focus:outline-none"
                  disabled={!item.url}
                >
                  <div 
                    className="rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.03] group-active:scale-[0.98]"
                    style={{ 
                      backgroundColor: colors.card_bg || colors.button_bg || 'rgba(255,255,255,0.1)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }}
                  >
                    {/* Media - 4:5 aspect ratio */}
                    {mediaUrl && (
                      <div className="aspect-[4/5] relative">
                        {isVideo ? (
                          <video 
                            src={mediaUrl} 
                            className="w-full h-full object-cover"
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <>
                            <img 
                              src={mediaUrl} 
                              alt={item.title || ''} 
                              className="w-full h-full object-cover"
                            />
                            {/* Gradient overlay for text */}
                            {item.title && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            )}
                            {/* Text overlay */}
                            {item.title && (
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className="font-bold text-white text-base leading-tight line-clamp-2 drop-shadow-lg">
                                  {item.title}
                                </h3>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Text only card (no media) */}
                    {!mediaUrl && (
                      <div className="aspect-[4/5] flex flex-col justify-center p-4">
                        <h3 
                          className="font-bold text-center line-clamp-3"
                          style={{ color: colors.text || '#ffffff' }}
                        >
                          {item.title}
                        </h3>
                      </div>
                    )}
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Scroll indicator dots - mobile only */}
      <div className="flex justify-center gap-1.5 mt-4 md:hidden">
        {items.map((_, index) => (
          <div 
            key={index}
            className="w-2 h-2 rounded-full transition-all"
            style={{ 
              backgroundColor: colors.text || '#ffffff',
              opacity: 0.3
            }}
          />
        ))}
      </div>
    </div>
  );
};

const LinkBioPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await fetch(`${API_URL}/api/multilink/public/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Page non trouvée');
          } else {
            setError('Erreur de chargement');
          }
          return;
        }
        const data = await response.json();
        setPage(data);
      } catch (err) {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  const handleLinkClick = async (link) => {
    // Record click
    try {
      await fetch(`${API_URL}/api/multilink/public/${slug}/click/${link.id}`, {
        method: 'POST'
      });
    } catch (err) {
      // Silent fail
    }
    
    // Open link
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleBlockClick = async (block) => {
    // Record block click for analytics
    try {
      await fetch(`${API_URL}/api/multilink/public/${slug}/block-click/${block.id}`, {
        method: 'POST'
      });
    } catch (err) {
      // Silent fail - don't block user interaction
    }
  };

  const handleSocialClick = async (social) => {
    // Record click if it has an id
    if (social.id) {
      try {
        await fetch(`${API_URL}/api/multilink/public/${slug}/click/${social.id}`, {
          method: 'POST'
        });
      } catch (err) {
        // Silent fail
      }
    }
    
    window.open(social.url, '_blank', 'noopener,noreferrer');
  };

  const getIcon = (iconName) => {
    if (!iconName) return Link;
    const Icon = ICON_MAP[iconName.toLowerCase()];
    return Icon || Link;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-white/50 mx-auto" />
          <p className="text-white/40 mt-3 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Link className="w-10 h-10 text-white/30" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">404</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <a 
            href="https://alphagency.fr" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-all"
          >
            Retour à l&apos;accueil
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const colors = page.custom_colors && Object.keys(page.custom_colors).length > 0 
    ? { ...page.theme_colors, ...page.custom_colors } 
    : (page.theme_colors || {});
  const design = page.design_settings || {};
  const socialLinks = page.social_links || [];
  const contentLinks = (page.links || []).filter(l => l.link_type !== 'social');
  
  // Determine background style
  const getBackgroundStyle = () => {
    if (design.background_type === 'gradient' && design.gradient) {
      return { background: design.gradient };
    }
    if (design.background_type === 'image' && design.background_image) {
      return { 
        backgroundImage: `url(${design.background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return { background: colors.background || '#0f0f1a' };
  };

  // Button styles based on design settings
  const getButtonStyle = () => {
    const buttonStyle = design.button_style || 'rounded';
    const baseClasses = 'w-full p-4 flex items-center gap-4 transition-all duration-300 group';
    
    switch (buttonStyle) {
      case 'pill':
        return `${baseClasses} rounded-full`;
      case 'square':
        return `${baseClasses} rounded-none`;
      case 'soft':
        return `${baseClasses} rounded-2xl`;
      case 'outline':
        return `${baseClasses} rounded-xl border-2`;
      default:
        return `${baseClasses} rounded-xl`;
    }
  };

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={getBackgroundStyle()}
    >
      {/* Background overlay for images */}
      {design.background_type === 'image' && (
        <div className="fixed inset-0 bg-black/50 -z-10" />
      )}
      
      <div className="max-w-lg mx-auto relative z-10">
        {/* Profile Section */}
        <div className="text-center mb-10">
          {/* Profile Image */}
          {page.profile_image && (
            <div className="relative inline-block mb-4">
              <img
                src={page.profile_image}
                alt={page.title}
                className="w-28 h-28 rounded-full object-cover border-4 shadow-2xl"
                style={{ 
                  borderColor: colors.accent || '#6366f1',
                  boxShadow: `0 0 40px ${colors.accent || '#6366f1'}40`
                }}
              />
              {/* Verified badge */}
              {page.verified && (
                <div 
                  className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: colors.accent || '#6366f1' }}
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          )}
          
          {/* Title - Only show if show_title is enabled */}
          {(page.design_settings?.show_title !== false) && page.title && (
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: colors.text || '#ffffff' }}
            >
              {page.title}
            </h1>
          )}
          
          {/* Bio */}
          {page.bio && (
            <p 
              className="text-base opacity-80 max-w-md mx-auto leading-relaxed"
              style={{ color: colors.text || '#ffffff' }}
            >
              {page.bio}
            </p>
          )}
        </div>

        {/* Social Icons Row - Modern SVG icons like zaap.bio */}
        {socialLinks.length > 0 && (
          <div className="flex justify-center gap-3 mb-10 flex-wrap">
            {socialLinks.filter(s => s.is_active).map((social, index) => {
              const bgColor = SOCIAL_COLORS[social.icon] || colors.accent || '#6366f1';
              
              // Get modern icon component
              const getModernIcon = (iconName) => {
                const icons = {
                  instagram: ModernInstagramIcon,
                  facebook: ModernFacebookIcon,
                  twitter: ModernTwitterIcon,
                  youtube: ModernYouTubeIcon,
                  linkedin: ModernLinkedInIcon,
                  whatsapp: ModernWhatsAppIcon,
                  tiktok: ModernTikTokIcon,
                };
                return icons[iconName];
              };
              
              const ModernIcon = getModernIcon(social.icon);
              const FallbackIcon = getIcon(social.icon);
              
              return (
                <button
                  key={social.id || index}
                  onClick={() => handleSocialClick(social)}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg overflow-hidden"
                  style={{ 
                    background: social.custom_icon ? 'transparent' : bgColor,
                    boxShadow: social.custom_icon ? 'none' : `0 4px 15px ${typeof bgColor === 'string' && !bgColor.includes('gradient') ? bgColor + '40' : 'rgba(0,0,0,0.3)'}`
                  }}
                  title={social.label}
                >
                  {/* Use custom icon if available */}
                  {social.custom_icon ? (
                    <img 
                      src={social.custom_icon} 
                      alt={social.label} 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : ModernIcon ? (
                    <div className="w-6 h-6 text-white">
                      <ModernIcon />
                    </div>
                  ) : (
                    <FallbackIcon className="w-5 h-5 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Featured Image/Banner */}
        {page.banner_image && (
          <div className="mb-6 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src={page.banner_image} 
              alt="Banner" 
              className="w-full h-auto"
            />
          </div>
        )}

        {/* UNIFIED BLOCKS RENDERING - Primary system */}
        {page.blocks && page.blocks.length > 0 && (
          <div className="space-y-4">
            {page.blocks.filter(block => block.is_active).map((block) => {
              const roundedClass = {
                'none': 'rounded-none',
                'sm': 'rounded-lg',
                'md': 'rounded-xl',
                'lg': 'rounded-2xl',
                'full': 'rounded-full'
              }[block.settings?.rounded || 'lg'] || 'rounded-2xl';
              
              const aspectClass = {
                '1:1': 'aspect-square',
                '4:5': 'aspect-[4/5]',
                '16:9': 'aspect-video',
                '9:16': 'aspect-[9/16]'
              }[block.settings?.aspect_ratio] || '';
              
              // Link blocks
              if (['link', 'button'].includes(block.block_type)) {
                const IconComponent = getIcon(block.icon);
                return (
                  <button
                    key={block.id}
                    onClick={() => handleLinkClick(block)}
                    className={`w-full ${roundedClass} p-4 flex items-center gap-4 transition-all duration-300 hover:scale-[1.02]`}
                    style={{
                      backgroundColor: colors.button_bg || 'rgba(255,255,255,0.1)',
                      color: colors.button_text || '#ffffff'
                    }}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (colors.accent || '#6366f1') + '20' }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: colors.accent || '#6366f1' }} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold">{block.label}</p>
                      {block.description && <p className="text-sm opacity-60 truncate">{block.description}</p>}
                    </div>
                  </button>
                );
              }
              
              // Link with image - zaap.bio style card with button
              if (block.block_type === 'link_image') {
                const openInNewTab = block.settings?.open_in === 'new_tab';
                const buttonText = block.settings?.button_text || 'En Savoir +';
                return (
                  <div
                    key={block.id}
                    className={`w-full ${roundedClass} overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
                    style={{
                      backgroundColor: colors.card_bg || colors.button_bg || 'rgba(255,255,255,0.1)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  >
                    {block.thumbnail && (
                      <img 
                        src={block.thumbnail} 
                        alt="" 
                        className={`w-full h-auto object-contain`}
                        style={{ maxHeight: '300px' }}
                      />
                    )}
                    <div className="p-4">
                      <p className="font-bold text-lg" style={{ color: colors.button_text || '#ffffff' }}>{block.label}</p>
                      {block.description && (
                        <p className="text-sm mt-2 opacity-80 leading-relaxed" style={{ color: colors.button_text || '#ffffff' }}>{block.description}</p>
                      )}
                      <button
                        onClick={() => {
                          handleBlockClick(block);
                          if (openInNewTab) {
                            window.open(block.url, '_blank', 'noopener,noreferrer');
                          } else {
                            window.location.href = block.url;
                          }
                        }}
                        className="mt-4 px-6 py-2.5 rounded-full font-medium text-sm transition-all hover:opacity-90"
                        style={{ 
                          backgroundColor: colors.accent || '#6366f1',
                          color: '#ffffff'
                        }}
                      >
                        {buttonText}
                      </button>
                    </div>
                  </div>
                );
              }
              
              // Image block
              if (block.block_type === 'image' && block.media_url) {
                return (
                  <div key={block.id} className={`${roundedClass} overflow-hidden`}>
                    <img 
                      src={block.media_url} 
                      alt="" 
                      className={`w-full ${aspectClass || 'h-auto'} object-cover`}
                    />
                  </div>
                );
              }
              
              // Video block
              if (block.block_type === 'video' && block.media_url) {
                return (
                  <div key={block.id} className={`${roundedClass} overflow-hidden`}>
                    <video 
                      src={block.media_url} 
                      className={`w-full ${aspectClass || 'h-auto'}`}
                      controls
                      playsInline
                    />
                  </div>
                );
              }
              
              // YouTube block
              if (block.block_type === 'youtube' && block.youtube_url) {
                // Extract video ID
                const videoId = block.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1];
                if (videoId) {
                  return (
                    <div key={block.id} className={`${roundedClass} overflow-hidden aspect-video`}>
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube video"
                      />
                    </div>
                  );
                }
              }
              
              // Text block - NOW WITH MARKDOWN RENDERING
              if (block.block_type === 'text' && block.content) {
                return (
                  <div 
                    key={block.id}
                    className={`p-4 ${roundedClass}`}
                    style={{ 
                      backgroundColor: colors.card_bg || colors.button_bg || 'rgba(255,255,255,0.1)',
                      color: colors.button_text || '#ffffff'
                    }}
                  >
                    {/* Render Markdown content */}
                    <div 
                      className="prose prose-invert prose-sm max-w-none"
                      style={{ color: colors.button_text || '#ffffff' }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {block.content}
                      </ReactMarkdown>
                    </div>
                    <style>{`
                      .prose p { margin: 0.5em 0; color: inherit; }
                      .prose h1, .prose h2, .prose h3 { color: inherit; font-weight: 700; margin: 0.5em 0; }
                      .prose h1 { font-size: 1.5em; }
                      .prose h2 { font-size: 1.25em; }
                      .prose h3 { font-size: 1.1em; }
                      .prose ul, .prose ol { padding-left: 1.5em; margin: 0.5em 0; }
                      .prose li { margin: 0.25em 0; }
                      .prose a { color: ${colors.accent || '#6366f1'}; text-decoration: underline; }
                      .prose strong { font-weight: 700; }
                      .prose em { font-style: italic; }
                    `}</style>
                  </div>
                );
              }
              
              // Header block
              if (block.block_type === 'header' && block.content) {
                return (
                  <h2 
                    key={block.id}
                    className="text-xl font-bold text-center py-2"
                    style={{ color: colors.text || '#ffffff' }}
                  >
                    {block.content}
                  </h2>
                );
              }
              
              // Divider block
              if (block.block_type === 'divider') {
                return (
                  <hr 
                    key={block.id}
                    className="border-0 h-px my-4"
                    style={{ backgroundColor: (colors.text || '#ffffff') + '20' }}
                  />
                );
              }
              
              // Carousel block
              if (block.block_type === 'carousel' && block.items?.length > 0) {
                return (
                  <div key={block.id}>
                    <CarouselSection 
                      items={block.items} 
                      colors={colors}
                      onItemClick={handleLinkClick}
                    />
                  </div>
                );
              }
              
              return null;
            })}
          </div>
        )}

        {/* LEGACY: Content Links - only show if no unified blocks */}
        {(!page.blocks || page.blocks.length === 0) && (
          <div className="space-y-3">
            {/* Legacy sections */}
            {page.sections && page.sections.length > 0 && (
              <div className="space-y-6 mb-6">
                {page.sections.filter(s => s.is_active).map((section) => (
                  <div key={section.id}>
                    {section.title && (
                      <h3 className="font-semibold mb-3 text-lg" style={{ color: colors.text || '#ffffff' }}>
                        {section.title}
                      </h3>
                    )}
                    {section.section_type === 'carousel' && (
                      <CarouselSection items={section.items} colors={colors} onItemClick={handleLinkClick} />
                    )}
                    {section.section_type === 'text' && section.content && (
                      <div className="p-4 rounded-2xl" style={{ backgroundColor: colors.button_bg || 'rgba(255,255,255,0.1)', color: colors.button_text || '#ffffff' }}>
                        <p className="whitespace-pre-wrap">{section.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Legacy links */}
            {contentLinks.filter(link => link.is_active).map((link) => {
            const IconComponent = getIcon(link.icon);
            const buttonStyle = design.button_style || 'rounded';
            const isOutline = buttonStyle === 'outline';
            const hasThumbnail = !!link.thumbnail;
            
            // Card style for links with thumbnails - zaap.bio style
            if (hasThumbnail) {
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link)}
                  className="w-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl text-left group"
                  style={{
                    backgroundColor: colors.button_bg || 'rgba(255,255,255,0.1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Image container - adapts to image aspect ratio */}
                  <div className="relative">
                    <img 
                      src={link.thumbnail} 
                      alt="" 
                      className="w-full h-auto object-contain rounded-t-2xl"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                  {/* Text content below image */}
                  <div className="p-4">
                    <p 
                      className="font-semibold text-base"
                      style={{ color: colors.button_text || '#ffffff' }}
                    >
                      {link.label}
                    </p>
                    {link.description && (
                      <p 
                        className="text-sm mt-1 opacity-70 line-clamp-2"
                        style={{ color: colors.button_text || '#ffffff' }}
                      >
                        {link.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            }
            
            // Standard button style for links without thumbnails
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link)}
                className={getButtonStyle()}
                style={{
                  backgroundColor: isOutline ? 'transparent' : (colors.button_bg || 'rgba(255,255,255,0.1)'),
                  borderColor: isOutline ? (colors.button_bg || 'rgba(255,255,255,0.3)') : 'transparent',
                  color: colors.button_text || '#ffffff'
                }}
                onMouseEnter={(e) => {
                  if (!isOutline) {
                    e.currentTarget.style.backgroundColor = colors.button_hover || 'rgba(255,255,255,0.2)';
                  }
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  if (!isOutline) {
                    e.currentTarget.style.backgroundColor = colors.button_bg || 'rgba(255,255,255,0.1)';
                  }
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Link icon */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (colors.accent || '#6366f1') + '20' }}
                >
                  <IconComponent className="w-5 h-5" style={{ color: colors.accent || '#6366f1' }} />
                </div>
                
                {/* Link content */}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold">{link.label}</p>
                  {link.description && (
                    <p className="text-sm opacity-60 truncate">{link.description}</p>
                  )}
                </div>
                
                {/* Arrow */}
                <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
          </div>
        )}

        {/* Empty state */}
        {(!page.blocks || page.blocks.length === 0) && contentLinks.filter(l => l.is_active).length === 0 && socialLinks.filter(s => s.is_active).length === 0 && (
          <div className="text-center py-12">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <Link className="w-8 h-8" style={{ color: colors.text || '#ffffff', opacity: 0.5 }} />
            </div>
            <p style={{ color: colors.text || '#ffffff', opacity: 0.6 }}>
              Aucun lien disponible
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <a 
            href="https://alphagency.fr"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all hover:opacity-100"
            style={{ 
              color: colors.text || '#ffffff',
              opacity: 0.4,
              backgroundColor: 'rgba(255,255,255,0.05)'
            }}
          >
            <span>Créé avec</span>
            <span className="font-bold">Alpha Agency</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default LinkBioPage;
