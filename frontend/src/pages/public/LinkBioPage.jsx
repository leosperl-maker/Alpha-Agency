import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Instagram, Facebook, Twitter, Youtube, Linkedin, 
  MessageCircle, Send, Mail, Globe, ShoppingBag, Calendar,
  Phone, MapPin, Link, Download, Play, Music, Mic, BookOpen,
  ExternalLink, Loader2
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

  const getIcon = (iconName, iconType) => {
    if (!iconName) return Link;
    
    if (iconType === 'social' || iconType === 'lucide') {
      const Icon = ICON_MAP[iconName.toLowerCase()];
      return Icon || Link;
    }
    
    return Link;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">404</h1>
          <p className="text-gray-600">{error}</p>
          <a href="https://alphagency.fr" className="mt-4 inline-block text-indigo-600 hover:underline">
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  const colors = page.theme_colors || {};
  const isGradient = colors.background?.includes('gradient');

  // Dynamic styles based on theme
  const containerStyle = {
    background: colors.background || '#ffffff',
    minHeight: '100vh'
  };

  const textStyle = {
    color: colors.text || '#1a1a1a'
  };

  const buttonStyle = {
    backgroundColor: colors.button_bg || '#f3f4f6',
    color: colors.button_text || '#1a1a1a',
    transition: 'all 0.2s ease'
  };

  const buttonHoverStyle = {
    backgroundColor: colors.button_hover || '#e5e7eb'
  };

  return (
    <div style={containerStyle} className="px-4 py-8 md:py-12">
      <div className="max-w-md mx-auto">
        {/* Profile Section */}
        <div className="text-center mb-8">
          {page.profile_image && (
            <img
              src={page.profile_image}
              alt={page.title}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full mx-auto mb-4 object-cover border-4 shadow-lg"
              style={{ borderColor: colors.accent || '#6366f1' }}
            />
          )}
          
          <h1 
            className="text-xl md:text-2xl font-bold mb-2"
            style={textStyle}
          >
            {page.title}
          </h1>
          
          {page.bio && (
            <p 
              className="text-sm md:text-base opacity-80 max-w-sm mx-auto"
              style={textStyle}
            >
              {page.bio}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3">
          {page.links?.map((link) => {
            const IconComponent = getIcon(link.icon, link.icon_type);
            
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link)}
                className="w-full p-4 rounded-xl flex items-center justify-between group shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = buttonHoverStyle.backgroundColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = buttonStyle.backgroundColor;
                }}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="w-5 h-5" style={{ color: colors.accent || '#6366f1' }} />
                  <span className="font-medium text-left">{link.label}</span>
                </div>
                <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <a 
            href="https://alphagency.fr"
            className="inline-flex items-center gap-2 text-xs opacity-50 hover:opacity-80 transition-opacity"
            style={textStyle}
          >
            <span>Propulsé par</span>
            <span className="font-semibold">Alpha Agency</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default LinkBioPage;
