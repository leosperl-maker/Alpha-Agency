import React, { useState, useEffect, useRef } from 'react';
import {
  Instagram,
  Plus,
  Image,
  Video,
  Type,
  BarChart2,
  HelpCircle,
  Clock,
  Calendar,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Link as LinkIcon,
  AtSign,
  Hash,
  Timer,
  Sliders,
  ArrowLeft,
  X,
  Move,
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
// ACCOUNT MANAGEMENT MODAL
// ============================================================================
const AddAccountModal = ({ isOpen, onClose, onAccountAdded }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API}/api/instagram-story/accounts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de l\'ajout du compte');
        return;
      }

      toast.success('Compte ajouté avec succès');
      setUsername('');
      setPassword('');
      onAccountAdded();
      onClose();
    } catch (error) {
      toast.error('Erreur de connexion');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Ajouter un compte</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Nom d'utilisateur Instagram
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              disabled={isLoading}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// ACCOUNT CARD
// ============================================================================
const AccountCard = ({ account, isBlueStacks = false, onDelete, onTest }) => {
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch(
        `${API}/api/instagram-story/accounts/${account.id}/test`,
        {
          method: 'POST',
          headers: getHeaders(),
        }
      );

      if (response.ok) {
        toast.success('Compte connecté avec succès');
      } else {
        toast.error('Erreur lors de la connexion au compte');
      }
    } catch (error) {
      toast.error('Erreur de test');
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Instagram size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">@{account.username}</p>
          <p className="text-sm text-white/50">
            {'Compte Instagram'} •{' '}
            {account.story_count || 0} stories
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {account.connected && (
          <CheckCircle2 size={18} className="text-green-500" />
        )}
        {!account.connected && (
          <XCircle size={18} className="text-red-500" />
        )}

        {!isBlueStacks && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                'Tester'
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(account.id)}
              className="text-red-500 hover:text-red-400"
            >
              <Trash2 size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// STICKER CONFIGURATOR
// ============================================================================
const StickerConfigurator = ({ onConfigured, onCancel }) => {
  const [stickerType, setStickerType] = useState(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionA, setPollOptionA] = useState('');
  const [pollOptionB, setPollOptionB] = useState('');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [mention, setMention] = useState('');
  const [hashtag, setHashtag] = useState('');
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState('');
  const [sliderQuestion, setSliderQuestion] = useState('');

  const stickers = [
    { id: 'poll', label: 'Sondage', icon: BarChart2 },
    { id: 'question', label: 'Question FAQ', icon: HelpCircle },
    { id: 'link', label: 'Lien', icon: LinkIcon },
    { id: 'mention', label: 'Mention', icon: AtSign },
    { id: 'hashtag', label: 'Hashtag', icon: Hash },
    { id: 'countdown', label: 'Compte à rebours', icon: Timer },
    { id: 'slider', label: 'Curseur', icon: Sliders },
  ];

  const handleContinue = () => {
    if (!stickerType) {
      toast.error('Sélectionnez un type de sticker');
      return;
    }

    let stickerData = { type: stickerType };

    switch (stickerType) {
      case 'poll':
        if (!pollQuestion || !pollOptionA || !pollOptionB) {
          toast.error('Remplissez tous les champs du sondage');
          return;
        }
        stickerData = {
          ...stickerData,
          config: {
            question: pollQuestion,
            options: [pollOptionA, pollOptionB],
          },
        };
        break;
      case 'question':
        if (!faqQuestion) {
          toast.error('Entrez une question');
          return;
        }
        stickerData = {
          ...stickerData,
          config: { question: faqQuestion, answer: faqAnswer },
        };
        break;
      case 'link':
        if (!linkUrl) {
          toast.error('Entrez une URL');
          return;
        }
        stickerData = {
          ...stickerData,
          config: { url: linkUrl, text: linkText || 'Lien' },
        };
        break;
      case 'mention':
        if (!mention) {
          toast.error('Entrez un nom d\'utilisateur');
          return;
        }
        stickerData = {
          ...stickerData,
          config: { username: mention.replace('@', '') },
        };
        break;
      case 'hashtag':
        if (!hashtag) {
          toast.error('Entrez un hashtag');
          return;
        }
        stickerData = {
          ...stickerData,
          config: { tag: hashtag.replace('#', '') },
        };
        break;
      case 'countdown':
        if (!countdownTitle || !countdownDate) {
          toast.error('Remplissez tous les champs du compte à rebours');
          return;
        }
        stickerData = {
          ...stickerData,
          config: {
            title: countdownTitle,
            end_time: new Date(countdownDate).toISOString(),
          },
        };
        break;
      case 'slider':
        if (!sliderQuestion) {
          toast.error('Entrez une question pour le curseur');
          return;
        }
        stickerData = {
          ...stickerData,
          config: { question: sliderQuestion },
        };
        break;
      default:
        break;
    }

    onConfigured(stickerData);
  };

  if (!stickerType) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Type de sticker</h3>
        <div className="grid grid-cols-2 gap-3">
          {stickers.map((sticker) => {
            const Icon = sticker.icon;
            return (
              <button
                key={sticker.id}
                onClick={() => setStickerType(sticker.id)}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-white/20 transition text-left"
              >
                <Icon size={20} className="text-pink-500 mb-2" />
                <p className="text-sm text-white font-medium">{sticker.label}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setStickerType(null)}
        className="text-white/70 hover:text-white flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      {stickerType === 'poll' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Créer un sondage</h3>
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Question
            </label>
            <Input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Votre question..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">Option A</label>
            <Input
              value={pollOptionA}
              onChange={(e) => setPollOptionA(e.target.value)}
              placeholder="Option 1"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">Option B</label>
            <Input
              value={pollOptionB}
              onChange={(e) => setPollOptionB(e.target.value)}
              placeholder="Option 2"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      )}

      {stickerType === 'question' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Question FAQ</h3>
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Question
            </label>
            <Input
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              placeholder="Votre question..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">Réponse</label>
            <Input
              value={faqAnswer}
              onChange={(e) => setFaqAnswer(e.target.value)}
              placeholder="Votre réponse..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      )}

      {stickerType === 'link' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Ajouter un lien</h3>
          <div>
            <label className="block text-sm text-white/70 mb-2">URL</label>
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Texte du lien (optionnel)
            </label>
            <Input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Texte du lien"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      )}

      {stickerType === 'mention' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Mentionner</h3>
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Nom d'utilisateur
            </label>
            <Input
              value={mention}
              onChange={(e) => setMention(e.target.value)}
              placeholder="@username"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      )}

      {stickerType === 'hashtag' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Ajouter un hashtag</h3>
          <div>
            <label className="block text-sm text-white/70 mb-2">Hashtag</label>
            <Input
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              placeholder="#hashtag"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      )}

      {stickerType === 'countdown' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Compte à rebours
          </h3>
          <div>
            <label className="block text-sm text-white/70 mb-2">Titre</label>
            <Input
              value={countdownTitle}
              onChange={(e) => setCountdownTitle(e.target.value)}
              placeholder="Titre du compte à rebours"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">Date/heure</label>
            <Input
              type="datetime-local"
              value={countdownDate}
              onChange={(e) => setCountdownDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      )}

      {stickerType === 'slider' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Curseur</h3>
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Question
            </label>
            <Input
              value={sliderQuestion}
              onChange={(e) => setSliderQuestion(e.target.value)}
              placeholder="Votre question..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          onClick={handleContinue}
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// PHONE PREVIEW
// ============================================================================
const PhonePreview = ({
  mediaUrl,
  mediaType,
  stickers,
  textOverlay,
  onClickPreview,
  onRemoveSticker,
  onStickerDragEnd,
  selectedStickerId,
}) => {
  const previewRef = useRef(null);

  return (
    <div className="flex justify-center py-4">
      <div
        ref={previewRef}
        className="relative w-64 h-[576px] bg-black rounded-3xl border-8 border-gray-800 overflow-hidden cursor-crosshair shadow-2xl"
        onClick={(e) => {
          if (previewRef.current) {
            const rect = previewRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            onClickPreview({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
          }
        }}
      >
        {/* Media */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
          {mediaUrl && mediaType === 'image' && (
            <img
              src={mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          )}
          {mediaUrl && mediaType === 'video' && (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              controls
            />
          )}
        </div>

        {/* Stickers */}
        {stickers.map((sticker) => (
          <StickerPreview
            key={sticker.id}
            sticker={sticker}
            isSelected={selectedStickerId === sticker.id}
            onRemove={() => onRemoveSticker(sticker.id)}
            onDragEnd={onStickerDragEnd}
          />
        ))}

        {/* Text Overlay */}
        {textOverlay && (
          <div
            className="absolute text-white font-bold pointer-events-none select-none"
            style={{
              left: `${(textOverlay.position?.x || 0.5) * 100}%`,
              top: `${(textOverlay.position?.y || 0.5) * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: '18px',
              fontFamily:
                textOverlay.config?.font === 'Moderne'
                  ? 'sans-serif'
                  : textOverlay.config?.font === 'Néon'
                    ? 'monospace'
                    : 'Georgia, serif',
              color: textOverlay.config?.color || 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {textOverlay.text}
          </div>
        )}

        {/* Click indicator */}
        <div className="absolute top-4 right-4 text-white/50 text-xs pointer-events-none">
          Cliquez pour placer
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STICKER PREVIEW (in phone frame)
// ============================================================================
const StickerPreview = ({ sticker, isSelected, onRemove, onDragEnd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    setOffset({
      x: e.clientX - sticker.position.x * (256 * (576 / 256)),
      y: e.clientY - sticker.position.y * 576,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    if (rect) {
      onDragEnd(sticker.id, {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    }
  };

  const getStickerTypeIcon = () => {
    const types = {
      poll: BarChart2,
      question: HelpCircle,
      link: LinkIcon,
      mention: AtSign,
      hashtag: Hash,
      countdown: Timer,
      slider: Sliders,
    };
    const Icon = types[sticker.type] || BarChart2;
    return <Icon size={14} />;
  };

  return (
    <div
      className={`absolute bg-white/10 border rounded-lg p-2 cursor-move transition ${
        isSelected
          ? 'border-pink-500 bg-white/20'
          : 'border-white/20 hover:border-white/40'
      }`}
      style={{
        left: `${sticker.position.x * 100}%`,
        top: `${sticker.position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      <div className="flex items-center gap-2">
        <div className="text-white/70">{getStickerTypeIcon()}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-2 text-white/50 hover:text-red-400 transition"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// TEXT OVERLAY EDITOR
// ============================================================================
const TextOverlayEditor = ({ onTextAdded, onCancel }) => {
  const [text, setText] = useState('');
  const [font, setFont] = useState('Classique');
  const [color, setColor] = useState('white');
  const [showPositionStep, setShowPositionStep] = useState(false);

  const fonts = ['Classique', 'Moderne', 'Néon', 'Machine à écrire', 'Strong'];
  const colors = ['white', 'black', 'red', 'yellow', 'pink', 'purple', 'orange'];

  const handleContinue = () => {
    if (!text) {
      toast.error('Entrez du texte');
      return;
    }
    setShowPositionStep(true);
  };

  if (showPositionStep) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Positionnez le texte
        </h3>
        <p className="text-sm text-white/70">
          Cliquez sur le téléphone pour placer votre texte
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={onCancel}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
          >
            Valider
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Ajouter du texte</h3>

      <div>
        <label className="block text-sm text-white/70 mb-2">Texte</label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Votre texte..."
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-2">Police</label>
        <div className="grid grid-cols-2 gap-2">
          {fonts.map((f) => (
            <button
              key={f}
              onClick={() => setFont(f)}
              className={`p-2 rounded text-sm transition ${
                font === f
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
              style={{
                fontFamily:
                  f === 'Moderne'
                    ? 'sans-serif'
                    : f === 'Néon'
                      ? 'monospace'
                      : f === 'Machine à écrire'
                        ? 'monospace'
                        : 'Georgia, serif',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-2">Couleur</label>
        <div className="flex gap-2 flex-wrap">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded transition border-2 ${
                color === c ? 'border-white' : 'border-transparent'
              }`}
              style={{
                backgroundColor:
                  c === 'white'
                    ? '#ffffff'
                    : c === 'black'
                      ? '#000000'
                      : c === 'red'
                        ? '#ef4444'
                        : c === 'yellow'
                          ? '#eab308'
                          : c === 'pink'
                            ? '#ec4899'
                            : c === 'purple'
                              ? '#a855f7'
                              : '#f97316',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          onClick={handleContinue}
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// STORIES LIST VIEW
// ============================================================================
const StoriesList = ({ stories, activeTab, onPublish, onDelete, accounts }) => {
  const getAccountName = (accountId) => {
    const account = accounts.find((a) => a.id === accountId);
    return account ? `@${account.username}` : 'Compte inconnu';
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-gray-500', label: 'Brouillon' },
      scheduled: { bg: 'bg-blue-500', label: 'Programmé' },
      publishing: { bg: 'bg-yellow-500', label: 'Publication...' },
      published: { bg: 'bg-green-500', label: 'Publié' },
      failed: { bg: 'bg-red-500', label: 'Échoué' },
    };
    const badge = badges[status] || badges.draft;
    return (
      <span
        className={`inline-block ${badge.bg} text-white text-xs px-2 py-1 rounded-full`}
      >
        {badge.label}
      </span>
    );
  };

  const filteredStories = stories.filter((s) => {
    if (activeTab === 'pending') {
      return s.status === 'draft' || s.status === 'scheduled';
    }
    return s.status === 'published';
  });

  if (filteredStories.length === 0) {
    return (
      <div className="text-center py-12">
        <Image size={40} className="mx-auto text-white/30 mb-4" />
        <p className="text-white/50">
          {activeTab === 'pending'
            ? 'Aucune story en attente'
            : 'Aucune story publiée'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {filteredStories.map((story) => (
        <div
          key={story.id}
          className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4"
        >
          {/* Thumbnail */}
          <div className="w-20 h-36 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
            {story.media_url && (
              <img
                src={story.media_url}
                alt="Thumbnail"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-white font-medium">
                  {getAccountName(story.account_id)}
                </p>
                <p className="text-sm text-white/50">{story.id.slice(0, 8)}</p>
              </div>
              {getStatusBadge(story.status)}
            </div>

            {story.schedule_time && (
              <p className="text-xs text-white/50 mb-3">
                <Clock size={12} className="inline mr-1" />
                Programmé pour{' '}
                {new Date(story.schedule_time).toLocaleString('fr-FR')}
              </p>
            )}

            <div className="flex gap-2">
              {(story.status === 'draft' || story.status === 'scheduled') && (
                <Button
                  size="sm"
                  onClick={() => onPublish(story.id)}
                  className="bg-gradient-to-r from-pink-500 to-purple-500"
                >
                  <Send size={14} className="mr-2" />
                  Publier
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(story.id)}
                className="text-red-500 hover:text-red-400"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function InstagramStoryPage() {
  const [view, setView] = useState('accounts'); // 'accounts', 'creator', 'stories'
  const [accounts, setAccounts] = useState([]);
  const [bluestacksAccounts, setBluestacksAccounts] = useState([]);
  const [stories, setStories] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingStories, setIsLoadingStories] = useState(false);

  // Creator state
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [stickers, setStickers] = useState([]);
  const [textOverlay, setTextOverlay] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // UI state
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showStickerConfigurator, setShowStickerConfigurator] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [storiesTab, setStoriesTab] = useState('pending');

  const mediaInputRef = useRef(null);

  // ========================================================================
  // DATA LOADING
  // ========================================================================
  useEffect(() => {
    loadAccounts();
    loadStories();
  }, []);

  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const [crmRes, bluestacksRes] = await Promise.all([
        fetch(`${API}/api/instagram-story/accounts`, {
          headers: getHeaders(),
        }),
        fetch(`${API}/api/instagram-story/accounts/bluestacks`, {
          headers: getHeaders(),
        }),
      ]);

      if (crmRes.ok) {
        const data = await crmRes.json();
        setAccounts(data.accounts || []);
      }

      if (bluestacksRes.ok) {
        const data = await bluestacksRes.json();
        // Le backend retourne {accounts:[...]} ou {devices:[...]}
        const bsAccounts = data.accounts || (data.devices || []).map(d => ({
          id: d.id || 'bluestacks-device',
          username: (d.model || 'BlueStacks').replace(/_/g, ' '),
          device_id: d.id,
          model: d.model,
          login_success: true,
          source: 'bluestacks'
        }));
        setBluestacksAccounts(bsAccounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erreur lors du chargement des comptes');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const loadStories = async () => {
    setIsLoadingStories(true);
    try {
      const res = await fetch(`${API}/api/instagram-story/drafts`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setIsLoadingStories(false);
    }
  };

  // ========================================================================
  // MEDIA UPLOAD
  // ========================================================================
  const handleMediaUpload = async (file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Veuillez choisir une image ou une vidéo');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      setMediaUrl(data.url);
      setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
      toast.success('Média uploadé avec succès');
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Erreur lors de l\'upload du média');
    }
  };

  const handleMediaDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleMediaUpload(files[0]);
    }
  };

  // ========================================================================
  // STICKER MANAGEMENT
  // ========================================================================
  const handleStickerConfigured = (stickerData) => {
    const newSticker = {
      id: `sticker-${Date.now()}`,
      ...stickerData,
      position: { x: 0.5, y: 0.5 },
    };
    setStickers([...stickers, newSticker]);
    setSelectedStickerId(newSticker.id);
    setShowStickerConfigurator(false);
  };

  const handlePreviewClick = (position) => {
    if (showStickerConfigurator) {
      return;
    }

    if (showTextEditor) {
      if (textOverlay) {
        setTextOverlay({
          ...textOverlay,
          position,
        });
      }
      setShowTextEditor(false);
      return;
    }

    if (selectedStickerId) {
      const newStickers = stickers.map((s) =>
        s.id === selectedStickerId ? { ...s, position } : s
      );
      setStickers(newStickers);
      setSelectedStickerId(null);
      return;
    }
  };

  const handleAddSticker = () => {
    setShowStickerConfigurator(true);
  };

  const handleRemoveSticker = (stickerId) => {
    setStickers(stickers.filter((s) => s.id !== stickerId));
    setSelectedStickerId(null);
  };

  const handleStickerDragEnd = (stickerId, position) => {
    const newStickers = stickers.map((s) =>
      s.id === stickerId ? { ...s, position } : s
    );
    setStickers(newStickers);
  };

  // ========================================================================
  // TEXT OVERLAY
  // ========================================================================
  const handleAddText = () => {
    setShowTextEditor(true);
  };

  const handleTextAdded = (textData) => {
    setTextOverlay({
      text: textData.text,
      config: {
        font: textData.font,
        color: textData.color,
      },
      position: { x: 0.5, y: 0.8 },
    });
    setShowTextEditor(false);
  };

  // ========================================================================
  // STORY PUBLISHING
  // ========================================================================
  const handlePublishStory = async () => {
    if (!selectedAccount) {
      toast.error('Sélectionnez un compte');
      return;
    }

    if (!mediaUrl) {
      toast.error('Ajoutez une image ou une vidéo');
      return;
    }

    setIsPublishing(true);

    try {
      const payload = {
        account_id: selectedAccount,
        media_url: mediaUrl,
        media_type: mediaType,
        schedule_time: isScheduling && scheduleTime ? new Date(scheduleTime).toISOString() : null,
        elements: {
          stickers: stickers.length > 0 ? stickers : undefined,
          text_overlay: textOverlay ? textOverlay.text : undefined,
          text_overlay_config: textOverlay ? textOverlay.config : undefined,
          text_position: textOverlay ? textOverlay.position : undefined,
        },
      };

      const res = await fetch(`${API}/api/instagram-story/drafts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Publishing failed');
      }

      const data = await res.json();

      if (isScheduling) {
        toast.success('Story programmée avec succès');
      } else {
        const publishRes = await fetch(
          `${API}/api/instagram-story/drafts/${data.id}/publish`,
          {
            method: 'POST',
            headers: getHeaders(),
          }
        );

        if (publishRes.ok) {
          toast.success('Story publiée avec succès');
        }
      }

      setMediaUrl(null);
      setMediaType(null);
      setStickers([]);
      setTextOverlay(null);
      setSelectedAccount(null);
      setIsScheduling(false);
      setScheduleTime('');
      setView('stories');
      loadStories();
    } catch (error) {
      console.error('Error publishing story:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setIsPublishing(false);
    }
  };

  // ========================================================================
  // ACCOUNT ACTIONS
  // ========================================================================
  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) {
      return;
    }

    try {
      const res = await fetch(`${API}/api/instagram-story/accounts/${accountId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        toast.success('Compte supprimé');
        loadAccounts();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erreur de suppression');
    }
  };

  const handlePublishStoryFromList = async (storyId) => {
    try {
      const res = await fetch(
        `${API}/api/instagram-story/drafts/${storyId}/publish`,
        {
          method: 'POST',
          headers: getHeaders(),
        }
      );

      if (res.ok) {
        toast.success('Story publiée');
        loadStories();
      } else {
        toast.error('Erreur lors de la publication');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Erreur de publication');
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette story ?')) {
      return;
    }

    try {
      const res = await fetch(`${API}/api/instagram-story/drafts/${storyId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        toast.success('Story supprimée');
        loadStories();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('Erreur de suppression');
    }
  };

  // ========================================================================
  // RENDER: ACCOUNTS VIEW
  // ========================================================================
  if (view === 'accounts') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <Instagram size={32} className="text-pink-500" />
              Instagram Stories
            </h1>
            <p className="text-white/50">
              Gérez vos comptes et créez vos stories
            </p>
          </div>

          {/* Statut automatisation — petit bandeau discret */}
          <div className={`mb-8 flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${bluestacksAccounts.length > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20'}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bluestacksAccounts.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}`} />
            <span className={bluestacksAccounts.length > 0 ? 'text-green-400' : 'text-orange-400'}>
              {bluestacksAccounts.length > 0
                ? `Publication automatique prête (${bluestacksAccounts[0]?.model || 'BlueStacks'})`
                : 'BlueStacks non détecté — ouvrez Instagram sur BlueStacks pour activer la publication'}
            </span>
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Comptes enregistrés</h2>
              <Button
                onClick={() => setShowAddAccountModal(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-500"
              >
                <Plus size={16} className="mr-2" />
                Ajouter compte
              </Button>
            </div>

            {isLoadingAccounts ? (
              <div className="text-white/50 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Chargement...
              </div>
            ) : accounts.length > 0 ? (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onDelete={handleDeleteAccount}
                  />
                ))}
              </div>
            ) : (
              <p className="text-white/50">Aucun compte enregistré</p>
            )}
          </section>

          <div className="mt-12">
            <Button
              onClick={() => setView('creator')}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-lg px-8 py-6"
            >
              <Plus size={20} className="mr-2" />
              Créer une story
            </Button>
          </div>
        </div>

        <AddAccountModal
          isOpen={showAddAccountModal}
          onClose={() => setShowAddAccountModal(false)}
          onAccountAdded={loadAccounts}
        />
      </div>
    );
  }

  // ========================================================================
  // RENDER: CREATOR VIEW
  // ========================================================================
  if (view === 'creator') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => setView('accounts')}
              className="text-white/70 hover:text-white transition"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Créer une story</h1>
              <p className="text-white/50">Éditeur visuel avec aperçu en temps réel</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 order-first lg:order-last">
              <div className="sticky top-6 bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Aperçu</h2>

                {mediaUrl ? (
                  <PhonePreview
                    mediaUrl={mediaUrl}
                    mediaType={mediaType}
                    stickers={stickers}
                    textOverlay={textOverlay}
                    onClickPreview={handlePreviewClick}
                    onRemoveSticker={handleRemoveSticker}
                    onStickerDragEnd={handleStickerDragEnd}
                    selectedStickerId={selectedStickerId}
                  />
                ) : (
                  <div className="aspect-[9/16] bg-gradient-to-b from-gray-900 to-black rounded-2xl flex items-center justify-center text-white/50">
                    Votre story
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Compte</h2>
                <select
                  value={selectedAccount || ''}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Sélectionner un compte</option>
                  {bluestacksAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.source === 'bluestacks' ? `📱 ${a.username || a.model}` : `@${a.username}`}
                    </option>
                  ))}
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      CRM: @{a.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Média</h2>

                {mediaUrl ? (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-white/70 mb-2">
                        {mediaType === 'image' ? 'Image' : 'Vidéo'} uploadée
                      </p>
                      {mediaType === 'image' && (
                        <img
                          src={mediaUrl}
                          alt="Media"
                          className="max-h-40 rounded"
                        />
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMediaUrl(null);
                        setMediaType(null);
                      }}
                      className="w-full"
                    >
                      Changer le média
                    </Button>
                  </div>
                ) : (
                  <div
                    onDrop={handleMediaDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-white/40 transition"
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    <Image size={32} className="mx-auto text-white/50 mb-3" />
                    <p className="text-white font-medium mb-1">
                      Déposez votre média ici
                    </p>
                    <p className="text-white/50 text-sm">ou cliquez pour sélectionner</p>
                  </div>
                )}

                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleMediaUpload(e.target.files[0]);
                    }
                  }}
                  hidden
                />
              </div>

              {mediaUrl && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Stickers</h2>
                    <Button
                      size="sm"
                      onClick={handleAddSticker}
                      className="bg-gradient-to-r from-pink-500 to-purple-500"
                    >
                      <Plus size={14} className="mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  {showStickerConfigurator && (
                    <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                      <StickerConfigurator
                        onConfigured={handleStickerConfigured}
                        onCancel={() => setShowStickerConfigurator(false)}
                      />
                    </div>
                  )}

                  {stickers.length > 0 && (
                    <div className="space-y-2">
                      {stickers.map((sticker) => (
                        <div
                          key={sticker.id}
                          className="bg-white/5 p-3 rounded flex items-center justify-between text-sm"
                        >
                          <span className="text-white/70">
                            {sticker.type === 'poll' && 'Sondage'}
                            {sticker.type === 'question' && 'Question'}
                            {sticker.type === 'link' && 'Lien'}
                            {sticker.type === 'mention' && 'Mention'}
                            {sticker.type === 'hashtag' && 'Hashtag'}
                            {sticker.type === 'countdown' && 'Compte à rebours'}
                            {sticker.type === 'slider' && 'Curseur'}
                          </span>
                          <button
                            onClick={() => handleRemoveSticker(sticker.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mediaUrl && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Texte</h2>
                    {!textOverlay && (
                      <Button
                        size="sm"
                        onClick={handleAddText}
                        className="bg-gradient-to-r from-pink-500 to-purple-500"
                      >
                        <Type size={14} className="mr-1" />
                        Ajouter texte
                      </Button>
                    )}
                  </div>

                  {showTextEditor && (
                    <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                      <TextOverlayEditor
                        onTextAdded={handleTextAdded}
                        onCancel={() => setShowTextEditor(false)}
                      />
                    </div>
                  )}

                  {textOverlay && (
                    <div className="bg-white/5 p-4 rounded space-y-3">
                      <p className="text-white/70 text-sm">"{textOverlay.text}"</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTextOverlay(null)}
                          className="flex-1"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mediaUrl && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={() => setIsScheduling(false)}
                      className={`px-4 py-2 rounded-lg transition ${
                        !isScheduling
                          ? 'bg-pink-500 text-white'
                          : 'bg-white/5 text-white/70'
                      }`}
                    >
                      Publier maintenant
                    </button>
                    <button
                      onClick={() => setIsScheduling(true)}
                      className={`px-4 py-2 rounded-lg transition ${
                        isScheduling
                          ? 'bg-pink-500 text-white'
                          : 'bg-white/5 text-white/70'
                      }`}
                    >
                      Programmer
                    </button>
                  </div>

                  {isScheduling && (
                    <Input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  )}
                </div>
              )}

              {mediaUrl && (
                <Button
                  onClick={handlePublishStory}
                  disabled={isPublishing || !selectedAccount}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-lg py-6"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Publication en cours...
                    </>
                  ) : (
                    <>
                      <Send size={18} className="mr-2" />
                      {isScheduling ? 'Programmer la story' : 'Publier la story'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // RENDER: STORIES LIST VIEW
  // ========================================================================
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mes stories</h1>
            <p className="text-white/50">Gérez vos stories Instagram</p>
          </div>
          <Button
            onClick={() => setView('accounts')}
            className="bg-gradient-to-r from-pink-500 to-purple-500"
          >
            <Plus size={16} className="mr-2" />
            Nouvelle story
          </Button>
        </div>

        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setStoriesTab('pending')}
            className={`px-4 py-3 border-b-2 transition ${
              storiesTab === 'pending'
                ? 'border-pink-500 text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setStoriesTab('published')}
            className={`px-4 py-3 border-b-2 transition ${
              storiesTab === 'published'
                ? 'border-pink-500 text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Publiées
          </button>
        </div>

        {isLoadingStories ? (
          <div className="text-white/50 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Chargement...
          </div>
        ) : (
          <StoriesList
            stories={stories}
            activeTab={storiesTab}
            onPublish={handlePublishStoryFromList}
            onDelete={handleDeleteStory}
            accounts={[...accounts, ...bluestacksAccounts]}
          />
        )}
      </div>
    </div>
  );
}
