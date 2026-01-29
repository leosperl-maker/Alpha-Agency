import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Instagram, Facebook, Twitter, Youtube, Linkedin, 
  MessageCircle, Send, Mail, Globe, ShoppingBag, Calendar,
  Phone, MapPin, Link, Download, Play, Music, Mic, BookOpen,
  ExternalLink, Loader2, ChevronRight
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

  const colors = page.theme_colors || {};
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
        <div className="text-center mb-8">
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
          
          {/* Title */}
          <h1 
            className="text-2xl font-bold mb-2"
            style={{ color: colors.text || '#ffffff' }}
          >
            {page.title}
          </h1>
          
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

        {/* Social Icons Row */}
        {socialLinks.length > 0 && (
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {socialLinks.filter(s => s.is_active).map((social, index) => {
              const IconComponent = getIcon(social.icon);
              const bgColor = SOCIAL_COLORS[social.icon] || colors.accent || '#6366f1';
              
              return (
                <button
                  key={social.id || index}
                  onClick={() => handleSocialClick(social)}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                  style={{ 
                    background: bgColor,
                    boxShadow: `0 4px 15px ${typeof bgColor === 'string' && !bgColor.includes('gradient') ? bgColor + '40' : 'rgba(0,0,0,0.3)'}`
                  }}
                  title={social.label}
                >
                  <IconComponent className="w-5 h-5 text-white" />
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

        {/* Content Links */}
        <div className="space-y-3">
          {contentLinks.filter(link => link.is_active).map((link) => {
            const IconComponent = getIcon(link.icon);
            const buttonStyle = design.button_style || 'rounded';
            const isOutline = buttonStyle === 'outline';
            
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
                {/* Link thumbnail/icon */}
                {link.thumbnail ? (
                  <img 
                    src={link.thumbnail} 
                    alt="" 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: (colors.accent || '#6366f1') + '20' }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: colors.accent || '#6366f1' }} />
                  </div>
                )}
                
                {/* Link content */}
                <div className="flex-1 text-left">
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

        {/* Empty state */}
        {contentLinks.filter(l => l.is_active).length === 0 && socialLinks.filter(s => s.is_active).length === 0 && (
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
