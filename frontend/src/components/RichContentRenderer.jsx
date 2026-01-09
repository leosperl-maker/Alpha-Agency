/**
 * RichContentRenderer - Composant pour afficher le contenu riche (blocs)
 * Utilisé pour les pages publiques Portfolio et Blog
 */
import { Play, Pause, Download, ExternalLink, Volume2 } from "lucide-react";
import { useState } from "react";

// Single Image Block
const ImageBlock = ({ block }) => {
  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-2xl",
    large: "max-w-4xl",
    full: "w-full"
  };

  const alignmentClasses = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
    full: "w-full"
  };

  return (
    <figure className={`my-6 ${alignmentClasses[block.alignment || 'center']}`}>
      <img
        src={block.url}
        alt={block.caption || "Image"}
        className={`${sizeClasses[block.size || 'medium']} ${block.rounded !== false ? 'rounded-lg' : ''} shadow-lg`}
        loading="lazy"
      />
      {block.caption && (
        <figcaption className="text-sm text-[#666666] mt-2 text-center italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
};

// Gallery Block
const GalleryBlock = ({ block }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!block.urls || block.urls.length === 0) return null;

  return (
    <div className="my-8">
      <div className={`grid gap-3 ${
        block.urls.length === 1 ? 'grid-cols-1' :
        block.urls.length === 2 ? 'grid-cols-2' :
        block.urls.length === 3 ? 'grid-cols-3' :
        'grid-cols-2 md:grid-cols-4'
      }`}>
        {block.urls.map((url, idx) => (
          <div 
            key={idx} 
            className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
            onClick={() => setSelectedImage(url)}
          >
            <img
              src={url}
              alt={`Gallery image ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          </div>
        ))}
      </div>
      {block.caption && (
        <p className="text-sm text-[#666666] mt-2 text-center italic">{block.caption}</p>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
};

// Audio Block
const AudioBlock = ({ block }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleAudio = () => {
    const audio = document.getElementById(`audio-${block.id}`);
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!block.url) return null;

  return (
    <div className="my-6">
      <div className="bg-gradient-to-r from-[#CE0202]/10 to-[#CE0202]/5 p-5 rounded-xl border border-[#CE0202]/20">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleAudio}
            className="w-14 h-14 bg-[#CE0202] hover:bg-[#B00202] text-white rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-lg"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-[#CE0202]" />
              <span className="font-semibold text-[#1A1A1A]">
                {block.caption || "Écouter l'audio"}
              </span>
            </div>
            <p className="text-sm text-[#666666]">Cliquez pour écouter</p>
          </div>
        </div>
        <audio 
          id={`audio-${block.id}`}
          src={block.url} 
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>
    </div>
  );
};

// Video Block
const VideoBlock = ({ block }) => {
  if (!block.url) return null;

  // Check if it's a YouTube/Vimeo URL
  const isYouTube = block.url.includes('youtube.com') || block.url.includes('youtu.be');
  const isVimeo = block.url.includes('vimeo.com');

  if (isYouTube) {
    // Extract video ID
    const videoId = block.url.includes('youtu.be') 
      ? block.url.split('/').pop()
      : new URLSearchParams(new URL(block.url).search).get('v');
    
    return (
      <div className="my-6">
        <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={block.caption || "Video"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        {block.caption && (
          <p className="text-sm text-[#666666] mt-2 text-center italic">{block.caption}</p>
        )}
      </div>
    );
  }

  if (isVimeo) {
    const videoId = block.url.split('/').pop();
    return (
      <div className="my-6">
        <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
          <iframe
            src={`https://player.vimeo.com/video/${videoId}`}
            title={block.caption || "Video"}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        {block.caption && (
          <p className="text-sm text-[#666666] mt-2 text-center italic">{block.caption}</p>
        )}
      </div>
    );
  }

  // Direct video URL
  return (
    <div className="my-6">
      <video
        src={block.url}
        controls
        className="w-full rounded-lg shadow-lg"
        poster={block.thumbnail}
      >
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
      {block.caption && (
        <p className="text-sm text-[#666666] mt-2 text-center italic">{block.caption}</p>
      )}
    </div>
  );
};

// Quote Block
const QuoteBlock = ({ block }) => {
  return (
    <blockquote className="my-8 border-l-4 border-[#CE0202] pl-6 py-2 italic">
      <p className="text-xl text-[#1A1A1A] leading-relaxed">
        "{block.content}"
      </p>
      {block.caption && (
        <cite className="block mt-3 text-sm text-[#666666] not-italic">
          — {block.caption}
        </cite>
      )}
    </blockquote>
  );
};

// Main Renderer Component
const RichContentRenderer = ({ blocks = [], className = "" }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className={`rich-content ${className}`}>
      {blocks.map((block) => {
        switch (block.type) {
          case 'text':
            return (
              <div 
                key={block.id} 
                className="my-4 text-[#333333] leading-relaxed whitespace-pre-line text-base md:text-lg"
              >
                {block.content}
              </div>
            );

          case 'heading':
            const HeadingTag = block.level === 2 ? 'h2' : 'h3';
            return (
              <HeadingTag
                key={block.id}
                className={`font-bold text-[#1A1A1A] mt-8 mb-4 ${
                  block.level === 2 ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
                }`}
              >
                {block.content}
              </HeadingTag>
            );

          case 'image':
            return <ImageBlock key={block.id} block={block} />;

          case 'gallery':
            return <GalleryBlock key={block.id} block={block} />;

          case 'audio':
            return <AudioBlock key={block.id} block={block} />;

          case 'video':
            return <VideoBlock key={block.id} block={block} />;

          case 'quote':
            return <QuoteBlock key={block.id} block={block} />;

          default:
            return null;
        }
      })}
    </div>
  );
};

export default RichContentRenderer;
