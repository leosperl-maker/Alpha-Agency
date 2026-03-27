import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  Hash,
  AtSign,
  MapPin,
  BarChart2,
  HelpCircle,
  Timer,
  Sliders,
  Type,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCw,
  X,
  Image,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('alpha_token')}`,
  'Content-Type': 'application/json',
});

const getMultipartHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('alpha_token')}`,
});

// ============================================================================
// PHONE PREVIEW COMPONENT
// ============================================================================
const PhonePreview = ({ mediaUrl, stickers, selectedSticker, onStickerSelect, onStickerMove }) => {
  const previewRef = useRef(null);
  const dragStateRef = useRef(null);

  const handleMouseDown = (e, stickerId) => {
    e.preventDefault();
    dragStateRef.current = {
      stickerId,
      startX: e.clientX,
      startY: e.clientY,
      startPos: stickers.find(s => s.id === stickerId)?.position || { x: 0.5, y: 0.5 },
    };
    onStickerSelect(stickerId);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragStateRef.current || !previewRef.current) return;

      const rect = previewRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragStateRef.current.startX) / rect.width;
      const dy = (e.clientY - dragStateRef.current.startY) / rect.height;

      const newX = Math.max(0, Math.min(1, dragStateRef.current.startPos.x + dx));
      const newY = Math.max(0, Math.min(1, dragStateRef.current.startPos.y + dy));

      onStickerMove(dragStateRef.current.stickerId, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
    };

    {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [onStickerMove, stickers]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        ref={previewRef}
        className="relative bg-gradient-to-b from-[#1a1a1e] to-[#0a0a0f] rounded-3xl border border-white/10 overflow-hidden"
        style={{ aspectRatio: '9/16', width: '360px' }}
      >
        {/* Media background */}
        {mediaUrl && (
          <img
            src={mediaUrl}
            alt="Story preview"
            className="w-full h-full object-cover"
          />
        )}

        {/* Instagram header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Name</p>
            <p className="text-white/60 text-xs">53m</p>
          </div>
        </div>

        {/* Stickers */}
        {stickers.map((sticker) => {
          const isSelected = selectedSticker?.id === sticker.id;
          return (
            <StickerElement
              key={sticker.id}
              sticker={sticker}
              isSelected={isSelected}
              onMouseDown={(e) => handleMouseDown(e, sticker.id)}
              previewRect={previewRef.current?.getBoundingClientRect()}
            />
          );
        })}

        {/* Instagram footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded text-white/60">📷</div>
          <input
            type="text"
            placeholder="Send message"
            className="flex-1 bg-white/10 rounded-full px-3 py-1.5 text-xs text-white placeholder-white/40 outline-none"
            readOnly
          />
          <div className="w-6 h-6 text-white/60">⬆️</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STICKER ELEMENT (rendered on phone preview)
// ============================================================================
const StickerElement = ({ sticker, isSelected, onMouseDown, previewRect }) => {
  if (!previewRect) return null;

  const x = sticker.position.x * previewRect.width;
  const y = sticker.position.y * previewRect.height;
  const handleSize = 12;

  const renderSticker = () => {
    switch (sticker.type) {
      case 'poll':
        return (
          <div className="bg-white rounded-lg p-3 text-center max-w-xs">
            <p className="text-black font-bold text-sm mb-2">{sticker.config.question || 'Votre question ?'}</p>
            <div className="flex gap-2 text-xs font-semibold">
              <button className="flex-1 bg-gray-200 text-black py-1 rounded">
                {sticker.config.options?.[0] || 'A'}
              </button>
              <button className="flex-1 bg-gray-300 text-black py-1 rounded">
                {sticker.config.options?.[1] || 'B'}
              </button>
            </div>
          </div>
        );
      case 'question':
        return (
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-3 max-w-xs text-white">
            <p className="text-sm font-semibold mb-2">{sticker.config.question || 'Ask a question...'}</p>
            <input
              type="text"
              placeholder="Répondre..."
              className="w-full bg-white/20 rounded px-2 py-1 text-xs text-white placeholder-white/50 outline-none"
              readOnly
            />
          </div>
        );
      case 'link':
        return (
          <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 max-w-xs text-black text-sm font-semibold">
            <LinkIcon size={14} />
            {sticker.config.text || 'Link'}
          </div>
        );
      case 'mention':
        return (
          <div className="bg-white/90 rounded-full px-3 py-1 text-black text-sm font-semibold">
            @{sticker.config.username || 'username'}
          </div>
        );
      case 'hashtag':
        return (
          <div className="bg-white/90 rounded-full px-3 py-1 text-black text-sm font-semibold">
            #{sticker.config.tag || 'hashtag'}
          </div>
        );
      case 'countdown':
        return (
          <div className="bg-white rounded-lg p-3 text-center max-w-xs text-black">
            <p className="text-xs font-semibold mb-1">{sticker.config.title || 'Countdown'}</p>
            <p className="text-2xl font-bold font-mono">00:00:00</p>
          </div>
        );
      case 'slider':
        return (
          <div className="bg-white rounded-lg p-3 max-w-xs text-black">
            <p className="text-sm font-semibold mb-2">{sticker.config.question || 'Votre avis ?'}</p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                className="flex-1 h-1"
                min="0"
                max="100"
                defaultValue="50"
                readOnly
              />
              <span className="text-lg">😍</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${sticker.position.x * 100}%`,
        top: `${sticker.position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseDown={onMouseDown}
      role="button"
      tabIndex={0}
    >
      {renderSticker()}

      {/* Drag handles when selected */}
      {isSelected && (
        <>
          {/* Corner handles */}
          {[
            { top: -handleSize / 2, left: -handleSize / 2 },
            { top: -handleSize / 2, right: -handleSize / 2 },
            { bottom: -handleSize / 2, left: -handleSize / 2 },
            { bottom: -handleSize / 2, right: -handleSize / 2 },
          ].map((pos, i) => (
            <div
              key={`corner-${i}`}
              className="absolute bg-red-500 rounded-full border-2 border-white"
              style={{
                width: handleSize,
                height: handleSize,
                ...pos,
              }}
            />
          ))}

          {/* Midpoint handles */}
          {[
            { top: -handleSize / 2, left: '50%', transform: 'translateX(-50%)' },
            { top: '50%', right: -handleSize / 2, transform: 'translateY(-50%)' },
            { bottom: -handleSize / 2, left: '50%', transform: 'translateX(-50%)' },
            { top: '50%', left: -handleSize / 2, transform: 'translateY(-50%)' },
          ].map((pos, i) => (
            <div
              key={`mid-${i}`}
              className="absolute bg-red-500 rounded-full border-2 border-white"
              style={{
                width: handleSize,
                height: handleSize,
                ...pos,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

// ============================================================================
// STICKER CONFIG PANEL
// ============================================================================
const StickerConfigPanel = ({ sticker, onChange, onDelete, onLayerMove }) => {
  if (!sticker) return null;

  const handleInputChange = (key, value) => {
    onChange({
      ...sticker,
      config: { ...sticker.config, [key]: value },
    });
  };

  return (
    <div className="w-80 bg-[#1a1a1e] border-l border-white/10 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold">Modifier le sticker</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onLayerMove('up')}
            className="p-1.5 hover:bg-white/10 rounded"
            title="Move up"
          >
            <ChevronUp size={16} className="text-white/60" />
          </button>
          <button
            onClick={() => onLayerMove('down')}
            className="p-1.5 hover:bg-white/10 rounded"
            title="Move down"
          >
            <ChevronDown size={16} className="text-white/60" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/20 rounded"
            title="Delete"
          >
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </div>

      {sticker.type === 'poll' && (
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Question</label>
            <Input
              value={sticker.config.question || ''}
              onChange={(e) => handleInputChange('question', e.target.value)}
              placeholder="Votre question ?"
              className="bg-[#0a0a0f] border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Option A</label>
            <Input
              value={sticker.config.options?.[0] || ''}
              onChange={(e) => {
                const opts = [...(sticker.config.options || ['', ''])];
                opts[0] = e.target.value;
                handleInputChange('options', opts);
              }}
              placeholder="Option A"
              className="bg-[#0a0a0f] border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Option B</label>
            <Input
              value={sticker.config.options?.[1] || ''}
              onChange={(e) => {
                const opts = [...(sticker.config.options || ['', ''])];
                opts[1] = e.target.value;
                handleInputChange('options', opts);
              }}
              placeholder="Option B"
              className="bg-[#0a0a0f] border-white/20 text-white"
            />
          </div>
        </div>
      )}

      {sticker.type === 'question' && (
        <div>
          <label className="block text-white/60 text-sm mb-2">Question</label>
          <textarea
            value={sticker.config.question || ''}
            onChange={(e) => handleInputChange('question', e.target.value)}
            placeholder="Posez une question..."
            className="w-full bg-[#0a0a0f] border border-white/20 rounded px-3 py-2 text-white text-sm"
            rows={4}
          />
        </div>
      )}

      {sticker.type === 'link' && (
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">URL</label>
            <Input
              value={sticker.config.url || ''}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://example.com"
              className="bg-[#0a0a0f] border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Texte du lien</label>
            <Input
              value={sticker.config.text || ''}
              onChange={(e) => handleInputChange('text', e.target.value)}
              placeholder="Voir plus"
              className="bg-[#0a0a0f] border-white/20 text-white"
            />
          </div>
        </div>
      )}

      {sticker.type === 'mention' && (
        <div>
          <label className="block text-white/60 text-sm mb-2">Username</label>
          <Input
            value={sticker.config.username || ''}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="username"
            className="bg-[#0a0a0f] border-white/20 text-white"
          />
        </div>
      )}

      {sticker.type === 'hashtag' && (
        <div>
          <label className="block text-white/60 text-sm mb-2">Hashtag</label>
          <Input
            value={sticker.config.tag || ''}
            onChange={(e) => handleInputChange('tag', e.target.value)}
            placeholder="hashtag"
            className="bg-[#0a0a0f] border-white/20 text-white"
          />
        </div>
      )}

      {sticker.type === 'countdown' && (
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Title</label>
            <Input
              value={sticker.config.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Nom de l'événement"
              className="bg-[#0a0a0f] border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Date de fin</label>
            <Input
              type="datetime-local"
              value={sticker.config.end_time || ''}
              onChange={(e) => handleInputChange('end_time', e.target.value)}
              className="bg-[#0a0a0f] border-white/20 text-white"
            />
          </div>
        </div>
      )}

      {sticker.type === 'slider' && (
        <div>
          <label className="block text-white/60 text-sm mb-2">Question</label>
          <Input
            value={sticker.config.question || ''}
            onChange={(e) => handleInputChange('question', e.target.value)}
            placeholder="Qu'en pensez-vous ?"
            className="bg-[#0a0a0f] border-white/20 text-white"
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN EDITOR VIEW
// ============================================================================
const EditorView = ({ account, onBack, onPublish }) => {
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaLocalPath, setMediaLocalPath] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [stickers, setStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [textOverlay, setTextOverlay] = useState('');
  const fileInputRef = useRef(null);

  const handleMediaUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', file.type.startsWith('video') ? 'video' : 'image');

      const response = await fetch(`${API}/api/instagram-story/upload`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setMediaUrl(data.url);
      setMediaLocalPath(data.local_path);
      setMediaType(data.media_type);
      toast.success('Média uploadé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'upload du média');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const addSticker = (type) => {
    const newSticker = {
      id: `sticker-${Date.now()}`,
      type,
      position: { x: 0.5, y: 0.5 },
      config: {},
    };
    setStickers([...stickers, newSticker]);
    setSelectedSticker(newSticker);
  };

  const updateSticker = (updated) => {
    setStickers(stickers.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedSticker(updated);
  };

  const deleteSticker = (id) => {
    setStickers(stickers.filter((s) => s.id !== id));
    setSelectedSticker(null);
  };

  const moveSticker = (id, newPosition) => {
    setStickers(
      stickers.map((s) =>
        s.id === id ? { ...s, position: newPosition } : s
      )
    );
  };

  const moveLayer = (direction) => {
    if (!selectedSticker) return;
    const idx = stickers.findIndex((s) => s.id === selectedSticker.id);
    if (
      (direction === 'up' && idx === stickers.length - 1) ||
      (direction === 'down' && idx === 0)
    ) {
      return;
    }

    const newStickers = [...stickers];
    const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
    [newStickers[idx], newStickers[swapIdx]] = [
      newStickers[swapIdx],
      newStickers[idx],
    ];
    setStickers(newStickers);
  };

  const handlePublish = async () => {
    if (!mediaUrl) {
      toast.error('Ajoutez une image ou vidéo d\'abord');
      return;
    }

    const payload = {
      account_id: account.id,
      media_url: mediaUrl,
      media_type: mediaType,
      local_path: mediaLocalPath,
      text_overlay: textOverlay,
    };

    // Add sticker-specific data
    stickers.forEach((sticker) => {
      if (sticker.type === 'poll') {
        payload.poll = {
          question: sticker.config.question,
          options: sticker.config.options,
        };
      } else if (sticker.type === 'question') {
        payload.question = { question: sticker.config.question };
      } else if (sticker.type === 'link') {
        payload.link = { url: sticker.config.url, text: sticker.config.text };
      } else if (sticker.type === 'mention') {
        payload.mentions = payload.mentions || [];
        payload.mentions.push({
          username: sticker.config.username,
          position: sticker.position,
        });
      } else if (sticker.type === 'hashtag') {
        payload.hashtag = { tag: sticker.config.tag };
      } else if (sticker.type === 'countdown') {
        payload.countdown = {
          title: sticker.config.title,
          end_time: sticker.config.end_time,
        };
      } else if (sticker.type === 'slider') {
        payload.slider = { question: sticker.config.question };
      }
    });

    try {
      const response = await fetch(`${API}/api/instagram-story/drafts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erreur de création du brouillon');
      }

      const draft = await response.json();
      const publishResponse = await fetch(
        `${API}/api/instagram-story/drafts/${draft.draft_id}/publish`,
        {
          method: 'POST',
          headers: getHeaders(),
        }
      );

      if (!publishResponse.ok) {
        throw new Error('Erreur de publication');
      }

      toast.success('Story publiée avec succès !');
      onPublish();
    } catch (error) {
      toast.error('Erreur lors de la publication');
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-white/60 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
            <span className="text-white font-semibold">@{account.username}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Programmer
          </Button>
          <Button
            onClick={handlePublish}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
          >
            Publier maintenant
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-56 bg-[#0a0a0f]/50 border-r border-white/10 p-6 overflow-y-auto space-y-6">
          {/* Upload Section */}
          {!mediaUrl && (
            <div
              className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="text-white/60 mx-auto mb-2" size={24} />
              <p className="text-white/60 text-sm">Cliquez pour uploader</p>
              <p className="text-white/40 text-xs mt-1">ou glissez-déposez</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          )}

          {mediaUrl && isUploading && (
            <div className="text-center">
              <Loader2 className="text-white/60 mx-auto animate-spin" size={24} />
              <p className="text-white/60 text-sm mt-2">Upload en cours...</p>
            </div>
          )}

          {/* Sticker Tools */}
          <div className="space-y-2">
            <p className="text-white/40 text-xs font-semibold uppercase">Stickers</p>
            <button
              onClick={() => addSticker('link')}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <LinkIcon size={16} className="text-green-400" />
              <span className="text-sm">Lien</span>
            </button>
            <button
              onClick={() => addSticker('hashtag')}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <Hash size={16} className="text-blue-400" />
              <span className="text-sm">Hashtag</span>
            </button>
            <button
              onClick={() => addSticker('mention')}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <AtSign size={16} className="text-cyan-400" />
              <span className="text-sm">Mention</span>
            </button>
            <button
              onClick={() => addSticker('poll')}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <BarChart2 size={16} className="text-blue-400" />
              <span className="text-sm">Sondage</span>
            </button>
            <button
              onClick={() => addSticker('question')}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <HelpCircle size={16} className="text-pink-400" />
              <span className="text-sm">Question FAQ</span>
            </button>
            <button
              onClick={() => addSticker('countdown')}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <Timer size={16} className="text-gray-400" />
              <span className="text-sm">Compte à rebours</span>
            </button>
            <button
              onClick={() => addSticker('slider')}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <Sliders size={16} className="text-purple-400" />
              <span className="text-sm">Curseur</span>
            </button>
          </div>

          {/* Text Tool */}
          <div className="space-y-2">
            <p className="text-white/40 text-xs font-semibold uppercase">Text</p>
            <Input
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="Ajouter du texte..."
              className="bg-[#1a1a1e] border-white/20 text-white text-sm"
            />
          </div>
        </div>

        {/* Center - Phone Preview */}
        <PhonePreview
          mediaUrl={mediaUrl}
          stickers={stickers}
          selectedSticker={selectedSticker}
          onStickerSelect={(id) => setSelectedSticker(stickers.find(s => s.id === id) || null)}
          onStickerMove={moveSticker}
        />

        {/* Right Panel - Sticker Config */}
        {selectedSticker && (
          <StickerConfigPanel
            sticker={selectedSticker}
            onChange={updateSticker}
            onDelete={() => deleteSticker(selectedSticker.id)}
            onLayerMove={moveLayer}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function InstagramStoryPage() {
  const [view, setView] = useState('accounts'); // 'accounts', 'editor', 'stories'
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API}/api/instagram-story/accounts`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des comptes');
      console.error(error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newUsername) {
      toast.error('Veuillez entrer un nom d\'utilisateur');
      return;
    }

    setIsAddingAccount(true);
    try {
      const response = await fetch(`${API}/api/instagram-story/accounts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username: newUsername }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du compte');
      }

      toast.success('Compte ajouté avec succès');
      setNewUsername('');
      setShowAddModal(false);
      fetchAccounts();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du compte');
      console.error(error);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) return;

    try {
      await fetch(`${API}/api/instagram-story/accounts/${accountId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      toast.success('Compte supprimé');
      fetchAccounts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  if (view === 'editor' && selectedAccount) {
    return (
      <EditorView
        account={selectedAccount}
        onBack={() => {
          setView('accounts');
          setSelectedAccount(null);
        }}
        onPublish={() => {
          setView('accounts');
          setSelectedAccount(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2">Instagram Stories</h1>
        <p className="text-white/60">Gérez vos comptes et créez vos stories</p>
      </div>

      {/* Accounts Grid */}
      {isLoadingAccounts ? (
        <div className="flex justify-center">
          <Loader2 className="animate-spin text-white/60" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Add New Card */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 transition hover:bg-white/5"
          >
            <Plus size={32} className="text-white/60 mb-2" />
            <span className="text-white/60 font-medium">Ajouter un compte</span>
          </button>

          {/* Account Cards */}
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-6 rounded-2xl border border-white/10 hover:border-white/20 transition hover:bg-white/5 group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">@{account.username}</h3>
                  <p className="text-white/40 text-sm">{account.story_count || 0} stories</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedAccount(account);
                    setView('editor');
                  }}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg py-2 font-semibold transition text-sm"
                >
                  Créer une story
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="px-3 py-2 rounded-lg border border-white/20 hover:border-red-500 hover:text-red-500 transition"
                  title="Delete account"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {account.status === 'connected' ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Check size={14} />Connecté</div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertCircle size={14} />En attente</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1e] border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Ajouter un compte Instagram</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-sm mb-2">Nom d'utilisateur Instagram</label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="nom_utilisateur"
                  className="bg-[#0a0a0f] border-white/20 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setNewUsername('');
                }}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddAccount}
                disabled={isAddingAccount}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
              >
                {isAddingAccount ? <Loader2 className="animate-spin" size={18} /> : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}