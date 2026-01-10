import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, Play, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

// Text renderer with markdown-like support
const renderRichText = (text) => {
  if (!text) return null;
  
  // Simple markdown parsing
  let result = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-[#CE0202] underline hover:no-underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br/>');
  
  return <span dangerouslySetInnerHTML={{ __html: result }} />;
};

// Individual Block Renderers
const TextBlock = ({ block }) => (
  <div className={`prose prose-lg max-w-none text-${block.alignment || 'left'}`}>
    {renderRichText(block.content)}
  </div>
);

const HeadingBlock = ({ block }) => {
  const Tag = `h${block.level || 2}`;
  const sizes = {
    1: 'text-4xl md:text-5xl font-black',
    2: 'text-3xl md:text-4xl font-bold',
    3: 'text-2xl md:text-3xl font-semibold',
    4: 'text-xl md:text-2xl font-medium'
  };
  
  return (
    <Tag className={`${sizes[block.level || 2]} text-[#1A1A1A] text-${block.alignment || 'left'}`}>
      {block.content}
    </Tag>
  );
};

const ListBlock = ({ block }) => {
  const Tag = block.ordered ? 'ol' : 'ul';
  return (
    <Tag className={`${block.ordered ? 'list-decimal' : 'list-disc'} list-inside space-y-2 text-[#333333]`}>
      {(block.items || []).map((item, i) => (
        <li key={i} className="text-lg">{item}</li>
      ))}
    </Tag>
  );
};

const QuoteBlock = ({ block }) => (
  <blockquote className="border-l-4 border-[#CE0202] pl-6 py-4 bg-[#F8F8F8] rounded-r-lg my-8">
    <p className="text-xl md:text-2xl italic text-[#333333] mb-4">"{block.content}"</p>
    {(block.author || block.role) && (
      <footer className="text-[#666666]">
        {block.author && <span className="font-semibold">{block.author}</span>}
        {block.role && <span className="text-sm ml-2">— {block.role}</span>}
      </footer>
    )}
  </blockquote>
);

const ImageBlock = ({ block }) => {
  const alignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto'
  };
  
  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-xl',
    large: 'max-w-3xl',
    full: 'max-w-full'
  };

  return (
    <figure className={`${alignmentClasses[block.alignment || 'center']} ${sizeClasses[block.size || 'large']}`}>
      <img
        src={block.url}
        alt={block.caption || ''}
        className={`w-full object-cover ${block.rounded ? 'rounded-2xl' : ''} ${block.shadow ? 'shadow-2xl' : ''}`}
      />
      {block.caption && (
        <figcaption className="mt-3 text-center text-sm text-[#666666] italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
};

const GalleryBlock = ({ block }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = block.images || [];

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setSelectedImage(images[index]);
  };

  const navigate = (direction) => {
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % images.length 
      : (currentIndex - 1 + images.length) % images.length;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  if (block.layout === 'carousel') {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-4">
          {images.map((img, i) => (
            <div key={i} className="flex-shrink-0 w-80 snap-center">
              <img
                src={img.url}
                alt={img.caption || ''}
                className={`w-full h-60 object-cover ${block.rounded ? 'rounded-xl' : ''} cursor-pointer`}
                onClick={() => openLightbox(i)}
              />
              {img.caption && <p className="mt-2 text-sm text-[#666666] text-center">{img.caption}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`grid ${gridCols[block.columns || 3]} gap-4`}>
        {images.map((img, i) => (
          <div key={i} className="group cursor-pointer overflow-hidden" onClick={() => openLightbox(i)}>
            <img
              src={img.url}
              alt={img.caption || ''}
              className={`w-full h-48 md:h-64 object-cover transition-transform duration-500 group-hover:scale-105 ${block.rounded ? 'rounded-xl' : ''}`}
            />
            {img.caption && <p className="mt-2 text-sm text-[#666666]">{img.caption}</p>}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              onClick={(e) => { e.stopPropagation(); navigate('prev'); }}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <img
              src={selectedImage.url}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              onClick={(e) => { e.stopPropagation(); navigate('next'); }}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const VideoBlock = ({ block }) => {
  const getEmbedUrl = () => {
    if (block.type === 'youtube') {
      const videoId = block.url?.split('v=')[1]?.split('&')[0] || block.url?.split('/').pop()?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (block.type === 'vimeo') {
      const videoId = block.url?.split('/').pop()?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return block.url;
  };

  if (block.type === 'direct') {
    return (
      <figure className="rounded-2xl overflow-hidden">
        <video controls className="w-full">
          <source src={block.url} />
        </video>
        {block.caption && <figcaption className="mt-3 text-center text-sm text-[#666666]">{block.caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure>
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        <iframe
          src={getEmbedUrl()}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      {block.caption && <figcaption className="mt-3 text-center text-sm text-[#666666]">{block.caption}</figcaption>}
    </figure>
  );
};

const PDFBlock = ({ block }) => {
  return (
    <figure className="my-8">
      {block.title && (
        <div className="flex items-center justify-between mb-4 p-4 bg-[#F8F8F8] rounded-t-lg border border-[#E5E5E5] border-b-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#CE0202] rounded-lg flex items-center justify-center text-white font-bold text-sm">
              PDF
            </div>
            <span className="font-medium text-[#1A1A1A]">{block.title}</span>
          </div>
          {block.downloadable !== false && (
            <a 
              href={block.url} 
              download 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#CE0202] text-white rounded-lg hover:bg-[#B50202] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Télécharger
            </a>
          )}
        </div>
      )}
      {block.preview !== false && block.url && (
        <div className="border border-[#E5E5E5] rounded-b-lg overflow-hidden bg-gray-100" style={{height: '600px'}}>
          <iframe 
            src={block.url} 
            className="w-full h-full" 
            title={block.title || 'Document PDF'}
          />
        </div>
      )}
      {block.preview === false && !block.title && block.url && (
        <a 
          href={block.url} 
          download 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#CE0202] text-white rounded-lg hover:bg-[#B50202] transition-colors"
        >
          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center font-bold text-xs">PDF</div>
          Télécharger le document
        </a>
      )}
    </figure>
  );
};

const BeforeAfterBlock = ({ block }) => {
  const [position, setPosition] = useState(50);

  return (
    <figure>
      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden select-none">
        {/* After Image (background) */}
        <img src={block.after} alt="Après" className="absolute inset-0 w-full h-full object-cover" />
        
        {/* Before Image (clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img src={block.before} alt="Avant" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: `${100 / (position / 100)}%` }} />
        </div>
        
        {/* Slider */}
        <div 
          className="absolute inset-y-0 w-1 bg-white cursor-ew-resize"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-[#333]" />
            <ChevronRight className="w-4 h-4 text-[#333]" />
          </div>
        </div>
        
        {/* Slider Input */}
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(e) => setPosition(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
        
        {/* Labels */}
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 text-white text-sm rounded-full">AVANT</div>
        <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/70 text-white text-sm rounded-full">APRÈS</div>
      </div>
      {block.caption && <figcaption className="mt-3 text-center text-sm text-[#666666]">{block.caption}</figcaption>}
    </figure>
  );
};

const StatsBlock = ({ block }) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[block.columns || 4]} gap-6 md:gap-8 py-8`}>
      {(block.items || []).map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="text-center"
        >
          <div className="text-4xl md:text-5xl font-black text-[#CE0202] mb-2">{item.value}</div>
          <div className="text-sm md:text-base text-[#666666] uppercase tracking-wide">{item.label}</div>
        </motion.div>
      ))}
    </div>
  );
};

const CTABlock = ({ block }) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  const buttonStyles = {
    primary: 'bg-[#CE0202] hover:bg-[#B00202] text-white',
    outline: 'border-2 border-[#CE0202] text-[#CE0202] hover:bg-[#CE0202] hover:text-white',
    ghost: 'text-[#CE0202] hover:bg-[#CE0202]/10'
  };

  return (
    <div className={`flex ${alignmentClasses[block.alignment || 'center']} py-4`}>
      <a
        href={block.url || '#'}
        target={block.url?.startsWith('http') ? '_blank' : undefined}
        rel={block.url?.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={`inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all ${buttonStyles[block.style || 'primary']}`}
      >
        {block.text || 'En savoir plus'}
        {block.url?.startsWith('http') && <ExternalLink className="w-4 h-4" />}
      </a>
    </div>
  );
};

const DividerBlock = ({ block }) => {
  const styles = {
    line: 'border-t-2',
    dashed: 'border-t-2 border-dashed',
    dotted: 'border-t-2 border-dotted',
    gradient: 'h-0.5 bg-gradient-to-r from-transparent via-[#CE0202] to-transparent border-none'
  };

  return (
    <div className="py-6">
      <div className={styles[block.style || 'line']} style={{ borderColor: block.color || '#E5E5E5' }} />
    </div>
  );
};

const SpacerBlock = ({ block }) => {
  const heights = { sm: '16px', md: '32px', lg: '64px', xl: '96px' };
  return <div style={{ height: heights[block.height || 'md'] }} />;
};

const AccordionBlock = ({ block }) => {
  const [openItems, setOpenItems] = useState([]);

  const toggleItem = (index) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="space-y-3">
      {(block.items || []).map((item, i) => (
        <div key={i} className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          <button
            onClick={() => toggleItem(i)}
            className="w-full flex items-center justify-between px-6 py-4 bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors text-left"
          >
            <span className="font-semibold text-[#1A1A1A]">{item.title}</span>
            <ChevronDown className={`w-5 h-5 text-[#666666] transition-transform ${openItems.includes(i) ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openItems.includes(i) && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 text-[#333333]">
                  {renderRichText(item.content)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

const CodeBlock = ({ block }) => (
  <div className="rounded-xl overflow-hidden">
    <div className="bg-[#1A1A1A] px-4 py-2 text-xs text-[#999999] uppercase">
      {block.language || 'code'}
    </div>
    <pre className="bg-[#0D0D0D] p-4 overflow-x-auto">
      <code className="text-sm text-green-400 font-mono">{block.code}</code>
    </pre>
  </div>
);

const SectionBlock = ({ block, renderBlocks }) => {
  const paddings = { sm: 'py-4 px-4', md: 'py-8 px-6', lg: 'py-12 px-8' };
  
  return (
    <div 
      className={`rounded-2xl ${paddings[block.padding || 'lg']}`}
      style={{ backgroundColor: block.backgroundColor || '#F8F8F8', color: block.textColor || '#1A1A1A' }}
    >
      {block.blocks && block.blocks.length > 0 && renderBlocks(block.blocks)}
    </div>
  );
};

// Main Renderer Component
const AdvancedBlockRenderer = ({ blocks = [] }) => {
  const renderBlock = (block, index) => {
    const key = block.id || `block-${index}`;
    const isFirst = index === 0;
    const isLast = index === blocks.length - 1;
    
    // Different spacing based on block type
    const getSpacing = () => {
      if (['image', 'gallery', 'video', 'beforeAfter'].includes(block.type)) {
        return { marginTop: isFirst ? 0 : 64, marginBottom: isLast ? 0 : 64 }; // 64px = 4rem
      }
      if (['stats', 'quote'].includes(block.type)) {
        return { marginTop: isFirst ? 0 : 48, marginBottom: isLast ? 0 : 48 }; // 48px = 3rem
      }
      if (['heading'].includes(block.type)) {
        return { marginTop: isFirst ? 0 : 32, marginBottom: 16 };
      }
      return { marginBottom: isLast ? 0 : 24 };
    };
    
    const wrapper = (children) => (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={getSpacing()}
      >
        {children}
      </motion.div>
    );

    switch (block.type) {
      case 'text': return wrapper(<TextBlock block={block} />);
      case 'heading': return wrapper(<HeadingBlock block={block} />);
      case 'list': return wrapper(<ListBlock block={block} />);
      case 'quote': return wrapper(<QuoteBlock block={block} />);
      case 'image': return wrapper(<ImageBlock block={block} />);
      case 'gallery': return wrapper(<GalleryBlock block={block} />);
      case 'video': return wrapper(<VideoBlock block={block} />);
      case 'beforeAfter': return wrapper(<BeforeAfterBlock block={block} />);
      case 'stats': return wrapper(<StatsBlock block={block} />);
      case 'cta': return wrapper(<CTABlock block={block} />);
      case 'divider': return wrapper(<DividerBlock block={block} />);
      case 'spacer': return <SpacerBlock key={key} block={block} />;
      case 'accordion': return wrapper(<AccordionBlock block={block} />);
      case 'code': return wrapper(<CodeBlock block={block} />);
      case 'section': return wrapper(<SectionBlock block={block} renderBlocks={(b) => b.map((bl, i) => renderBlock(bl, i))} />);
      default: return null;
    }
  };

  return (
    <div className="space-y-0">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
};

export default AdvancedBlockRenderer;
