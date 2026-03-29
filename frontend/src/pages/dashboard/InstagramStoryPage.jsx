import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Upload, Link as LinkIcon, Hash, AtSign, BarChart2,
  HelpCircle, Timer, Plus, Trash2, ChevronUp, ChevronDown,
  X, Loader2, Check, Clock, Send, Edit3, Eye, MapPin, Bell, Camera, Type
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('alpha_token')}`,
  'Content-Type': 'application/json'
});
const getMultipartHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('alpha_token')}`
});

const FONTS = [
  { name: 'Classique', family: 'Georgia, serif', weight: 'normal' },
  { name: 'Moderne', family: 'Segoe UI, sans-serif', weight: 'normal' },
  { name: 'N\u00e9on', family: 'Impact, sans-serif', weight: 'bold' },
  { name: 'Machine \u00e0 \u00e9crire', family: 'Courier New, monospace', weight: 'normal' },
  { name: 'Strong', family: 'Arial Black, sans-serif', weight: '900' }
];

const COLORS = ['#FFFFFF', '#000000', '#FF0000', '#FFD700', '#FF1493', '#800080', '#0000FF', '#00AA00', '#FFA500'];

// Instagram sticker color schemes — the small circle at top cycles through these
const STICKER_COLORS = {
  poll: [
    { gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)', circle: '#D93B7A' },
    { gradient: 'linear-gradient(135deg, #0095F6, #00D4FF)', circle: '#0095F6' },
    { gradient: 'linear-gradient(135deg, #00C853, #64DD17)', circle: '#00C853' },
    { gradient: 'linear-gradient(135deg, #FF6F00, #FF9100)', circle: '#FF6F00' },
    { gradient: 'linear-gradient(135deg, #7C4DFF, #B388FF)', circle: '#7C4DFF' },
    { gradient: 'linear-gradient(135deg, #FF1744, #FF5252)', circle: '#FF1744' },
  ],
  question: [
    { gradient: 'linear-gradient(135deg, #D93B7A, #833AB4)', circle: '#D93B7A', inputBg: 'rgba(255,255,255,0.2)', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #0095F6, #00D4FF)', circle: '#0095F6', inputBg: 'rgba(255,255,255,0.2)', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #00C853, #64DD17)', circle: '#00C853', inputBg: 'rgba(255,255,255,0.2)', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #1a1a2e, #333366)', circle: '#1a1a2e', inputBg: 'rgba(255,255,255,0.15)', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #FF6F00, #FFD600)', circle: '#FF6F00', inputBg: 'rgba(255,255,255,0.2)', textColor: '#FFFFFF' },
  ],
  countdown: [
    { gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)', circle: '#D93B7A' },
    { gradient: 'linear-gradient(135deg, #0095F6, #00D4FF)', circle: '#0095F6' },
    { gradient: 'linear-gradient(135deg, #00C853, #64DD17)', circle: '#00C853' },
    { gradient: 'linear-gradient(135deg, #1a1a2e, #333366)', circle: '#1a1a2e' },
    { gradient: 'linear-gradient(135deg, #FF6F00, #FF9100)', circle: '#FF6F00' },
  ],
  slider: [
    { trackGradient: 'linear-gradient(to right, #833AB4, #FD1D1D, #FCB045)', bg: '#FFFFFF', circle: '#D93B7A', textColor: '#262626' },
    { trackGradient: 'linear-gradient(to right, #0095F6, #00D4FF)', bg: '#FFFFFF', circle: '#0095F6', textColor: '#262626' },
    { trackGradient: 'linear-gradient(to right, #00C853, #64DD17)', bg: '#FFFFFF', circle: '#00C853', textColor: '#262626' },
    { trackGradient: 'linear-gradient(to right, #FF6F00, #FF9100)', bg: '#FFFFFF', circle: '#FF6F00', textColor: '#262626' },
  ],
  location: [
    { bg: '#FFFFFF', text: '#262626', icon: '#262626' },
    { bg: 'rgba(0,0,0,0.6)', text: '#FFFFFF', icon: '#FFFFFF' },
    { bg: '#833AB4', text: '#FFFFFF', icon: '#FFFFFF' },
    { bg: '#0095F6', text: '#FFFFFF', icon: '#FFFFFF' },
    { bg: '#FF1744', text: '#FFFFFF', icon: '#FFFFFF' },
  ],
  notification: [
    { gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)', circle: '#D93B7A' },
    { gradient: 'linear-gradient(135deg, #0095F6, #00D4FF)', circle: '#0095F6' },
    { gradient: 'linear-gradient(135deg, #1a1a2e, #333366)', circle: '#1a1a2e' },
  ],
};

// Text background modes: none -> dark -> light -> colored
const TEXT_BG_MODES = ['none', 'dark', 'light', 'colored'];

// Main component
export default function InstagramStoryPage() {
  const [view, setView] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [stories, setStories] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [storiesFilter, setStoriesFilter] = useState('pending');
  const [storiesAccountFilter, setStoriesAccountFilter] = useState('all');

  // Editor state
  const [editorMode, setEditorMode] = useState('new');
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaLocalPath, setMediaLocalPath] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [stickers, setStickers] = useState([]);
  const [textOverlay, setTextOverlay] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [tempText, setTempText] = useState('');
  const [selectedFont, setSelectedFont] = useState('Classique');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [textBgMode, setTextBgMode] = useState('none'); // none | dark | light | colored

  useEffect(() => {
    if (view === 'accounts' || view === 'stories') loadAccounts();
  }, [view]);

  useEffect(() => {
    if (view === 'stories') loadStories();
  }, [view, storiesFilter, storiesAccountFilter]);

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch { toast.error('Erreur lors du chargement des comptes'); }
  };

  const loadStories = async () => {
    try {
      const res = await fetch(`${API}/api/instagram-story/drafts`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStories(data.stories || []);
    } catch { toast.error('Erreur lors du chargement des stories'); }
  };

  const addAccount = async () => {
    if (!newAccountUsername.trim()) { toast.error('Veuillez entrer un nom de compte'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ username: newAccountUsername }) });
      if (!res.ok) throw new Error('Failed');
      setNewAccountUsername('');
      setShowAddAccountModal(false);
      await loadAccounts();
      toast.success('Compte ajout\u00e9');
    } catch { toast.error("Erreur lors de l'ajout du compte"); }
    finally { setLoading(false); }
  };

  const deleteAccount = async (id) => {
    if (!window.confirm('\u00cates-vous s\u00fbr ?')) return;
    try {
      await fetch(`${API}/api/instagram-story/accounts/${id}`, { method: 'DELETE', headers: getHeaders() });
      await loadAccounts();
      toast.success('Compte supprim\u00e9');
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const startNewStory = (account) => {
    setSelectedAccount(account);
    setEditorMode('new');
    setEditingDraftId(null);
    resetEditor();
    setView('editor');
  };

  const viewAccountStories = (account) => {
    setStoriesAccountFilter(account.id);
    setView('stories');
  };

  const editStory = (story) => {
    setSelectedAccount(accounts.find(a => a.id === story.account_id));
    setEditorMode('edit');
    setEditingDraftId(story.draft_id || story.id);
    setMediaUrl(story.media_url);
    setMediaLocalPath(story.local_path);
    setMediaType(story.media_type);
    setStickers(story.elements || []);
    setSelectedSticker(null);
    if (story.schedule_time) setScheduleTime(new Date(story.schedule_time).toISOString().slice(0, 16));
    setView('editor');
  };

  const resetEditor = () => {
    setMediaUrl('');
    setMediaLocalPath('');
    setMediaType('image');
    setStickers([]);
    setSelectedSticker(null);
    setTextOverlay(null);
    setScheduleTime('');
    setTempText('');
    setSelectedFont('Classique');
    setSelectedColor('#FFFFFF');
    setTextBgMode('none');
  };

  const handleMediaUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/instagram-story/upload`, { method: 'POST', headers: getMultipartHeaders(), body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setMediaUrl(data.url);
      setMediaLocalPath(data.local_path);
      setMediaType(data.media_type);
      toast.success('M\u00e9dia charg\u00e9');
    } catch { toast.error("Erreur lors de l'upload du m\u00e9dia"); }
    finally { setLoading(false); }
  };

  const addSticker = (type) => {
    const defaults = {
      poll: { question: '', options: ['Oui', 'Non'], colorIndex: 0 },
      question: { question: '', colorIndex: 0 },
      link: { url: '', text: 'Lien' },
      mention: { username: '' },
      hashtag: { hashtag: '' },
      countdown: { title: '', endTime: '', colorIndex: 0 },
      slider: { question: '', emoji: '\ud83d\ude0d', colorIndex: 0 },
      location: { location: '', colorIndex: 0 },
      notification: { title: '', colorIndex: 0 },
      polaroid: { caption: '' }
    };
    const newSticker = {
      id: Math.random().toString(36).slice(2),
      type,
      position: { x: 0.5, y: 0.5 },
      data: defaults[type] || {}
    };
    setStickers(prev => [...prev, newSticker]);
    setSelectedSticker(newSticker);
  };

  const updateStickerData = (newData) => {
    if (!selectedSticker) return;
    const updated = { ...selectedSticker, data: newData };
    setStickers(prev => prev.map(s => s.id === selectedSticker.id ? updated : s));
    setSelectedSticker(updated);
  };

  const updateStickerPosition = (stickerId, position) => {
    setStickers(prev => prev.map(s => s.id === stickerId ? { ...s, position } : s));
    if (selectedSticker?.id === stickerId) {
      setSelectedSticker(prev => prev ? { ...prev, position } : null);
    }
  };

  const deleteSelectedSticker = () => {
    if (!selectedSticker) return;
    setStickers(prev => prev.filter(s => s.id !== selectedSticker.id));
    setSelectedSticker(null);
  };

  const moveSelectedSticker = (direction) => {
    if (!selectedSticker) return;
    const index = stickers.findIndex(s => s.id === selectedSticker.id);
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < stickers.length - 1)) {
      const newStickers = [...stickers];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newStickers[index], newStickers[newIndex]] = [newStickers[newIndex], newStickers[index]];
      setStickers(newStickers);
    }
  };

  // Cycle text background mode: none -> dark -> light -> colored
  const cycleTextBgMode = () => {
    const idx = TEXT_BG_MODES.indexOf(textBgMode);
    setTextBgMode(TEXT_BG_MODES[(idx + 1) % TEXT_BG_MODES.length]);
  };

  // Get text styles based on bgMode
  const getTextStyles = () => {
    switch (textBgMode) {
      case 'dark': return { bg: '#000000', textColor: '#FFFFFF' };
      case 'light': return { bg: '#FFFFFF', textColor: '#000000' };
      case 'colored': {
        // bg is the selected color, text is a lighter version
        const lighten = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgb(${Math.min(255, r + 140)}, ${Math.min(255, g + 140)}, ${Math.min(255, b + 140)})`;
        };
        return { bg: selectedColor, textColor: lighten(selectedColor === '#FFFFFF' ? '#0095F6' : selectedColor) };
      }
      default: return { bg: 'transparent', textColor: selectedColor };
    }
  };

  const addTextOverlay = () => {
    if (!tempText.trim()) { toast.error('Veuillez entrer du texte'); return; }
    const styles = getTextStyles();
    setTextOverlay({
      text: tempText,
      position: { x: 0.5, y: 0.3 },
      color: styles.textColor,
      font: selectedFont,
      bgColor: styles.bg,
      bgMode: textBgMode
    });
    setTempText('');
    toast.success('Texte ajout\u00e9');
  };

  const publishStory = async (publish = true) => {
    if (!mediaUrl) { toast.error('Veuillez ajouter une image ou vid\u00e9o'); return; }
    if (!selectedAccount) { toast.error('Veuillez s\u00e9lectionner un compte'); return; }

    setLoading(true);
    try {
      const payload = {
        account_id: selectedAccount.id,
        media_url: mediaUrl,
        media_type: mediaType,
        local_path: mediaLocalPath || null,
        schedule_time: scheduleTime ? new Date(scheduleTime).toISOString() : null,
        text_overlay: textOverlay?.text || null,
        text_position: textOverlay?.position || { x: 0.5, y: 0.3 },
        text_color: textOverlay?.color || '#FFFFFF',
        text_font: textOverlay?.font || 'Classique',
        elements: stickers.map(s => ({ type: s.type, position: s.position, data: s.data }))
      };

      let draftUrl = `${API}/api/instagram-story/drafts`;
      let method = 'POST';
      if (editorMode === 'edit' && editingDraftId) {
        draftUrl = `${API}/api/instagram-story/drafts/${editingDraftId}`;
        method = 'PUT';
      }

      const draftRes = await fetch(draftUrl, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      if (!draftRes.ok) throw new Error('Failed');
      const draftData = await draftRes.json();
      const draftId = draftData.draft_id || draftData.id;

      if (publish && !scheduleTime) {
        const pubRes = await fetch(`${API}/api/instagram-story/drafts/${draftId}/publish`, { method: 'POST', headers: getHeaders() });
        const pubData = await pubRes.json().catch(() => ({}));
        if (!pubRes.ok || pubData.success === false) {
          const errMsg = pubData.error || pubData.detail || pubData.message || '\u00c9chec de la publication';
          toast.error(`Publication \u00e9chou\u00e9e : ${errMsg}`);
          setLoading(false);
          return;
        }
        toast.success('Story publi\u00e9e !');
      } else if (scheduleTime) {
        toast.success('Story programm\u00e9e !');
      } else {
        toast.success('Brouillon enregistr\u00e9');
      }

      resetEditor();
      setView('accounts');
    } catch (err) { toast.error(`Erreur : ${err.message || 'Erreur inconnue'}`); }
    finally { setLoading(false); }
  };

  if (view === 'accounts') {
    return (
      <AccountsView
        accounts={accounts}
        onCreateStory={startNewStory}
        onViewStories={viewAccountStories}
        onDeleteAccount={deleteAccount}
        onAddAccount={() => setShowAddAccountModal(true)}
        onViewAllStories={() => { setStoriesAccountFilter('all'); setView('stories'); }}
        showAddModal={showAddAccountModal}
        onAddModalChange={setShowAddAccountModal}
        onUsernameChange={setNewAccountUsername}
        onAddSubmit={addAccount}
        username={newAccountUsername}
        isLoading={loading}
      />
    );
  }

  if (view === 'editor') {
    return (
      <EditorView
        accounts={accounts}
        selectedAccount={selectedAccount}
        onChangeAccount={(acc) => setSelectedAccount(acc)}
        mediaUrl={mediaUrl}
        mediaType={mediaType}
        onMediaUpload={handleMediaUpload}
        stickers={stickers}
        selectedSticker={selectedSticker}
        onSelectSticker={setSelectedSticker}
        onAddSticker={addSticker}
        onUpdateStickerData={updateStickerData}
        onUpdateStickerPosition={updateStickerPosition}
        onDeleteSticker={deleteSelectedSticker}
        onMoveSticker={moveSelectedSticker}
        textOverlay={textOverlay}
        onTextOverlayChange={setTextOverlay}
        tempText={tempText}
        onTempTextChange={setTempText}
        selectedFont={selectedFont}
        onFontChange={setSelectedFont}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        textBgMode={textBgMode}
        onCycleTextBg={cycleTextBgMode}
        getTextStyles={getTextStyles}
        onAddText={addTextOverlay}
        scheduleTime={scheduleTime}
        onScheduleTimeChange={setScheduleTime}
        onPublish={() => publishStory(!scheduleTime)}
        onSaveDraft={() => publishStory(false)}
        onGoBack={() => { setView('accounts'); resetEditor(); }}
        isLoading={loading}
      />
    );
  }

  if (view === 'stories') {
    return (
      <StoriesListView
        stories={stories}
        accounts={accounts}
        onEdit={editStory}
        onDelete={async (id) => {
          await fetch(`${API}/api/instagram-story/drafts/${id}`, { method: 'DELETE', headers: getHeaders() });
          await loadStories();
          toast.success('Supprim\u00e9e');
        }}
        onGoBack={() => setView('accounts')}
        filter={storiesFilter}
        onFilterChange={setStoriesFilter}
        accountFilter={storiesAccountFilter}
        onAccountFilterChange={setStoriesAccountFilter}
      />
    );
  }
}

/* ============================================
   ACCOUNTS VIEW
   ============================================ */
function AccountsView({ accounts, onCreateStory, onViewStories, onDeleteAccount, onAddAccount, onViewAllStories, showAddModal, onAddModalChange, onUsernameChange, onAddSubmit, username, isLoading }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Instagram Stories</h1>
          <p className="text-gray-400">G\u00e9rez vos comptes et cr\u00e9ez vos stories</p>
        </div>

        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-8 flex items-center gap-3">
          <Check size={20} className="text-green-400" />
          <span className="text-green-400">BlueStacks connect\u00e9 — publication automatique pr\u00eate</span>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Comptes enregistr\u00e9s</h2>
            <div className="flex gap-4">
              <Button onClick={onViewAllStories} variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2">
                <Eye size={18} /> Toutes les stories
              </Button>
              <Button onClick={onAddAccount} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
                <Plus size={18} /> Ajouter compte
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <p className="text-gray-400">Aucun compte enregistr\u00e9. Ajoutez-en un pour commencer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(account => (
                <div key={account.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {account.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">@{account.username}</h3>
                      <p className="text-gray-400 text-sm">{account.stories_count || 0} stories</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onCreateStory(account)} className="flex-1 bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white text-sm gap-1">
                      <Plus size={16} /> Cr\u00e9er
                    </Button>
                    <Button onClick={() => onViewStories(account)} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 text-sm gap-1">
                      <Eye size={16} /> Stories
                    </Button>
                    <Button onClick={() => onDeleteAccount(account.id)} variant="ghost" className="text-red-400 hover:bg-red-500/10 px-2" title="Supprimer">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => onAddModalChange(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Ajouter un compte</h3>
            <Input
              placeholder="Nom du compte (ex: moncompte)"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddSubmit()}
              className="mb-2 bg-white/5 border-white/10 text-white placeholder-gray-500"
            />
            <p className="text-xs text-gray-400 mb-4">Le compte doit \u00eatre d\u00e9j\u00e0 connect\u00e9 sur Instagram dans BlueStacks.</p>
            <div className="flex gap-2">
              <Button onClick={onAddSubmit} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white" disabled={isLoading}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Ajouter'}
              </Button>
              <Button onClick={() => onAddModalChange(false)} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================
   EDITOR VIEW
   ============================================ */
function EditorView({
  accounts, selectedAccount, onChangeAccount,
  mediaUrl, mediaType, onMediaUpload,
  stickers, selectedSticker, onSelectSticker, onAddSticker, onUpdateStickerData, onUpdateStickerPosition, onDeleteSticker, onMoveSticker,
  textOverlay, onTextOverlayChange,
  tempText, onTempTextChange, selectedFont, onFontChange, selectedColor, onColorChange,
  textBgMode, onCycleTextBg, getTextStyles, onAddText,
  scheduleTime, onScheduleTimeChange,
  onPublish, onSaveDraft, onGoBack, isLoading
}) {
  const uploadRef = useRef(null);
  const previewRef = useRef(null);
  const dragRef = useRef({ active: false, id: null, ox: 0, oy: 0 });
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const handleMediaClick = () => uploadRef.current?.click();

  // Drag and drop with document-level events
  const handleDragStart = (e, id) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;

    dragRef.current = {
      active: true,
      id,
      ox: e.clientX - rect.left - (sticker.position.x * rect.width),
      oy: e.clientY - rect.top - (sticker.position.y * rect.height)
    };
    onSelectSticker(sticker);
  };

  const handleTextDragStart = (e) => {
    if (e.button !== 0 || !textOverlay) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      active: true,
      id: '__text__',
      ox: e.clientX - rect.left - (textOverlay.position.x * rect.width),
      oy: e.clientY - rect.top - (textOverlay.position.y * rect.height)
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active || !previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left - dragRef.current.ox) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top - dragRef.current.oy) / rect.height));

      if (dragRef.current.id === '__text__') {
        onTextOverlayChange(prev => prev ? { ...prev, position: { x, y } } : null);
      } else {
        onUpdateStickerPosition(dragRef.current.id, { x, y });
      }
    };

    const onUp = () => { dragRef.current.active = false; };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [onUpdateStickerPosition, onTextOverlayChange]);

  // Text background style label
  const bgModeLabels = { none: 'Aa', dark: 'Aa', light: 'Aa', colored: 'Aa' };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ArrowLeft size={20} />
            </button>

            {/* Account Selector */}
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2 hover:bg-white/10 transition"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-pink-600 flex items-center justify-center text-xs font-bold">
                  {selectedAccount?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="font-medium">@{selectedAccount?.username || 'Choisir'}</span>
                <ChevronDown size={16} />
              </button>

              {showAccountDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-50 min-w-48 overflow-hidden">
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => { onChangeAccount(acc); setShowAccountDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-left ${selectedAccount?.id === acc.id ? 'bg-pink-600/20' : ''}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-pink-600 flex items-center justify-center text-xs font-bold">
                        {acc.username?.charAt(0)?.toUpperCase()}
                      </div>
                      <span>@{acc.username}</span>
                      {selectedAccount?.id === acc.id && <Check size={16} className="ml-auto text-pink-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Schedule */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Clock size={16} className="text-gray-400" />
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => onScheduleTimeChange(e.target.value)}
                className="bg-transparent text-white text-sm outline-none"
                style={{ colorScheme: 'dark' }}
              />
              {scheduleTime && (
                <button onClick={() => onScheduleTimeChange('')} className="text-gray-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <Button onClick={onSaveDraft} variant="outline" className="border-white/20 text-white hover:bg-white/10 text-sm">
              Brouillon
            </Button>

            <Button onClick={onPublish} className="bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white gap-2 text-sm" disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {scheduleTime ? 'Programmer' : 'Publier'}
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex gap-4" style={{ height: 'calc(100vh - 100px)' }}>
          {/* Left Sidebar - Tools */}
          <div className="w-52 flex-shrink-0 overflow-y-auto pr-2 flex flex-col gap-4">
            {/* Upload */}
            <div
              onClick={handleMediaClick}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onMediaUpload(f); }}
              className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-pink-400/50 hover:bg-white/5 transition"
            >
              {mediaUrl ? (
                <div>
                  <img src={mediaUrl} alt="" className="w-full h-20 object-cover rounded-lg mb-2" onError={(e) => { e.target.style.display = 'none'; }} />
                  <p className="text-xs text-gray-400">Cliquez pour changer</p>
                </div>
              ) : (
                <div className="py-4">
                  <Upload size={28} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Image ou vid\u00e9o</p>
                  <p className="text-xs text-gray-500 mt-1">Cliquez ou glissez</p>
                </div>
              )}
            </div>
            <input ref={uploadRef} type="file" accept="image/*,video/*" onChange={(e) => onMediaUpload(e.target.files?.[0])} className="hidden" />

            {/* Stickers */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Stickers</p>
              <div className="flex flex-col gap-1.5">
                <StickerBtn icon={<BarChart2 size={16} />} label="Sondage" onClick={() => onAddSticker('poll')} />
                <StickerBtn icon={<HelpCircle size={16} />} label="Question" onClick={() => onAddSticker('question')} />
                <StickerBtn icon={<span className="text-sm">\ud83d\ude0d</span>} label="Curseur" onClick={() => onAddSticker('slider')} />
                <StickerBtn icon={<Timer size={16} />} label="Compte \u00e0 rebours" onClick={() => onAddSticker('countdown')} />
                <StickerBtn icon={<MapPin size={16} />} label="Localisation" onClick={() => onAddSticker('location')} />
                <StickerBtn icon={<LinkIcon size={16} />} label="Lien" onClick={() => onAddSticker('link')} />
                <StickerBtn icon={<AtSign size={16} />} label="Mention" onClick={() => onAddSticker('mention')} />
                <StickerBtn icon={<Hash size={16} />} label="Hashtag" onClick={() => onAddSticker('hashtag')} />
                <StickerBtn icon={<Bell size={16} />} label="Notification" onClick={() => onAddSticker('notification')} />
                <StickerBtn icon={<Camera size={16} />} label="Polaro\u00efd" onClick={() => onAddSticker('polaroid')} />
              </div>
            </div>

            {/* Text */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Texte</p>
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Votre texte..."
                  value={tempText}
                  onChange={(e) => onTempTextChange(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 text-sm h-9"
                />

                {/* Text background toggle (framed A) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCycleTextBg}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border-2 transition font-bold text-sm"
                    style={{
                      borderColor: textBgMode === 'none' ? 'rgba(255,255,255,0.3)' : textBgMode === 'dark' ? '#000' : textBgMode === 'light' ? '#FFF' : selectedColor,
                      backgroundColor: textBgMode === 'dark' ? '#000' : textBgMode === 'light' ? '#FFF' : textBgMode === 'colored' ? selectedColor : 'transparent',
                      color: textBgMode === 'none' ? '#FFF' : textBgMode === 'dark' ? '#FFF' : textBgMode === 'light' ? '#000' : '#FFF'
                    }}
                    title="Fond du texte"
                  >
                    A
                  </button>
                  <span className="text-xs text-gray-400">
                    {textBgMode === 'none' ? 'Sans fond' : textBgMode === 'dark' ? 'Fond noir' : textBgMode === 'light' ? 'Fond blanc' : 'Fond couleur'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {FONTS.map(font => (
                    <button
                      key={font.name}
                      onClick={() => onFontChange(font.name)}
                      className={`text-left px-2.5 py-1.5 rounded text-xs transition ${selectedFont === font.name ? 'bg-pink-600/40 border border-pink-400/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                      style={{ fontFamily: font.family, fontWeight: font.weight }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => onColorChange(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${selectedColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <Button onClick={onAddText} className="w-full bg-white/10 hover:bg-white/20 text-white gap-1 text-xs h-8">
                  <Plus size={14} /> Ajouter texte
                </Button>
              </div>
            </div>
          </div>

          {/* Center: Phone Preview */}
          <div className="flex-1 flex justify-center items-start overflow-hidden">
            <div
              ref={previewRef}
              className="relative bg-black rounded-[2.5rem] border-[6px] border-gray-700 shadow-2xl overflow-hidden flex-shrink-0"
              style={{ width: '340px', height: '604px' }}
            >
              {/* Status bar */}
              <div className="h-8 bg-black flex items-center justify-between px-6 text-white text-xs relative z-20">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 border border-white rounded-sm relative"><div className="absolute inset-0.5 bg-white rounded-sm" style={{ width: '70%' }} /></div>
                </div>
              </div>

              {/* Instagram Header */}
              <div className="h-10 bg-gradient-to-b from-black/40 to-transparent flex items-center px-4 gap-2 relative z-20">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {selectedAccount?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="text-white text-sm font-semibold flex-1">{selectedAccount?.username || 'compte'}</span>
                <span className="text-gray-300 text-xs">Il y a 2h</span>
              </div>

              {/* Media Background */}
              {mediaUrl ? (
                <div className="absolute inset-0 z-0">
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={mediaUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <Upload size={48} className="mx-auto mb-2" />
                    <p className="text-sm">Ajoutez un m\u00e9dia</p>
                  </div>
                </div>
              )}

              {/* Sticker Layer */}
              <div className="absolute inset-0 z-10" style={{ top: '48px', bottom: '48px' }}>
                {stickers.map(sticker => (
                  <StickerRenderer
                    key={sticker.id}
                    sticker={sticker}
                    isSelected={selectedSticker?.id === sticker.id}
                    onSelect={() => onSelectSticker(sticker)}
                    onDragStart={(e) => handleDragStart(e, sticker.id)}
                    onUpdateData={(newData) => {
                      const updated = { ...sticker, data: newData };
                      onSelectSticker(updated);
                      onUpdateStickerData(newData);
                    }}
                  />
                ))}

                {/* Text Overlay */}
                {textOverlay && (
                  <div
                    className={`absolute cursor-move select-none ${selectedSticker?.id === '__text__' ? 'ring-2 ring-pink-400 ring-offset-2 ring-offset-transparent' : ''}`}
                    style={{
                      left: `${textOverlay.position.x * 100}%`,
                      top: `${textOverlay.position.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      fontFamily: FONTS.find(f => f.name === textOverlay.font)?.family || 'serif',
                      fontWeight: FONTS.find(f => f.name === textOverlay.font)?.weight || 'normal',
                      color: textOverlay.color,
                      backgroundColor: textOverlay.bgColor && textOverlay.bgColor !== 'transparent' ? textOverlay.bgColor : undefined,
                      padding: textOverlay.bgColor && textOverlay.bgColor !== 'transparent' ? '6px 14px' : undefined,
                      borderRadius: textOverlay.bgColor && textOverlay.bgColor !== 'transparent' ? '8px' : undefined,
                      textShadow: !textOverlay.bgColor || textOverlay.bgColor === 'transparent' ? '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' : 'none',
                      fontSize: '18px',
                      maxWidth: '80%',
                      textAlign: 'center',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.3
                    }}
                    onClick={() => onSelectSticker({ id: '__text__', type: 'text' })}
                    onMouseDown={handleTextDragStart}
                  >
                    {textOverlay.text}
                  </div>
                )}
              </div>

              {/* Instagram Footer */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent flex items-center px-4 z-20">
                <div className="flex-1 bg-white/20 rounded-full px-4 py-1.5 flex items-center">
                  <span className="text-white/60 text-xs">Envoyer un message</span>
                </div>
                <Send size={20} className="text-white ml-3" />
              </div>

              {/* Story progress bar */}
              <div className="absolute top-7 left-3 right-3 h-0.5 bg-white/30 rounded-full z-20 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '40%' }} />
              </div>
            </div>
          </div>

          {/* Right: Config Panel */}
          <div className="w-72 flex-shrink-0 overflow-y-auto pl-2">
            {selectedSticker ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider">
                    {selectedSticker.type === 'text' ? 'Texte' : `Sticker ${selectedSticker.type}`}
                  </h3>
                  <div className="flex gap-1">
                    {selectedSticker.type !== 'text' && (
                      <>
                        <button onClick={() => onMoveSticker('up')} className="p-1.5 hover:bg-white/10 rounded"><ChevronUp size={14} /></button>
                        <button onClick={() => onMoveSticker('down')} className="p-1.5 hover:bg-white/10 rounded"><ChevronDown size={14} /></button>
                        <button onClick={onDeleteSticker} className="p-1.5 hover:bg-red-500/20 rounded text-red-400"><Trash2 size={14} /></button>
                      </>
                    )}
                    {selectedSticker.type === 'text' && textOverlay && (
                      <button onClick={() => { onTextOverlayChange(null); onSelectSticker(null); }} className="p-1.5 hover:bg-red-500/20 rounded text-red-400"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>

                {/* Poll Config */}
                {selectedSticker.type === 'poll' && (
                  <PollConfig data={selectedSticker.data} onChange={onUpdateStickerData} />
                )}

                {/* Question Config */}
                {selectedSticker.type === 'question' && (
                  <QuestionConfig data={selectedSticker.data} onChange={onUpdateStickerData} />
                )}

                {/* Slider Config */}
                {selectedSticker.type === 'slider' && (
                  <SliderConfig data={selectedSticker.data} onChange={onUpdateStickerData} />
                )}

                {/* Countdown Config */}
                {selectedSticker.type === 'countdown' && (
                  <CountdownConfig data={selectedSticker.data} onChange={onUpdateStickerData} />
                )}

                {/* Location Config */}
                {selectedSticker.type === 'location' && (
                  <LocationConfig data={selectedSticker.data} onChange={onUpdateStickerData} />
                )}

                {/* Notification Config */}
                {selectedSticker.type === 'notification' && (
                  <NotificationConfig data={selectedSticker.data} onChange={onUpdateStickerData} />
                )}

                {/* Polaroid Config */}
                {selectedSticker.type === 'polaroid' && (
                  <div className="space-y-3">
                    <FieldInput label="L\u00e9gende" value={selectedSticker.data.caption || ''} onChange={(v) => onUpdateStickerData({ ...selectedSticker.data, caption: v })} placeholder="Ajouter une l\u00e9gende..." />
                  </div>
                )}

                {/* Link Config */}
                {selectedSticker.type === 'link' && (
                  <div className="space-y-3">
                    <FieldInput label="URL" value={selectedSticker.data.url || ''} onChange={(v) => onUpdateStickerData({ ...selectedSticker.data, url: v })} placeholder="https://..." />
                    <FieldInput label="Texte" value={selectedSticker.data.text || ''} onChange={(v) => onUpdateStickerData({ ...selectedSticker.data, text: v })} />
                  </div>
                )}

                {/* Mention Config */}
                {selectedSticker.type === 'mention' && (
                  <FieldInput label="@Username" value={selectedSticker.data.username || ''} onChange={(v) => onUpdateStickerData({ ...selectedSticker.data, username: v })} />
                )}

                {/* Hashtag Config */}
                {selectedSticker.type === 'hashtag' && (
                  <FieldInput label="#Hashtag" value={selectedSticker.data.hashtag || ''} onChange={(v) => onUpdateStickerData({ ...selectedSticker.data, hashtag: v })} />
                )}

                {/* Text info */}
                {selectedSticker.type === 'text' && (
                  <p className="text-gray-400 text-sm">Glissez le texte sur l'aper\u00e7u pour le d\u00e9placer.</p>
                )}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">Cliquez sur un sticker dans l'aper\u00e7u pour le configurer, ou ajoutez-en un depuis le panneau de gauche.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   STICKER COLOR CIRCLE — small circle at top that cycles colors
   ============================================ */
function ColorCircle({ colorIndex, colors, onChange }) {
  const idx = colorIndex || 0;
  const nextIdx = (idx + 1) % colors.length;
  const currentColor = colors[idx];
  const displayColor = currentColor.circle || currentColor.bg || '#833AB4';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(nextIdx); }}
      className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-lg z-10 transition-transform hover:scale-110"
      style={{ background: displayColor }}
      title="Changer la couleur"
    />
  );
}

/* ============================================
   POLL CONFIG
   ============================================ */
function PollConfig({ data, onChange }) {
  const options = data.options || ['Oui', 'Non'];
  const colorIndex = data.colorIndex || 0;

  const updateOption = (idx, value) => {
    const newOptions = [...options];
    newOptions[idx] = value;
    onChange({ ...data, options: newOptions });
  };

  const addOption = () => {
    if (options.length < 4) {
      onChange({ ...data, options: [...options, ''] });
    }
  };

  const removeOption = (idx) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== idx);
      onChange({ ...data, options: newOptions });
    }
  };

  return (
    <div className="space-y-3">
      <FieldInput label="Question" value={data.question || ''} onChange={(v) => onChange({ ...data, question: v })} placeholder="Posez une question..." />
      <div>
        <label className="block text-xs text-gray-400 mb-2">Options</label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-1 mb-2">
            <input
              type="text"
              value={typeof opt === 'string' ? opt : opt.text || ''}
              onChange={(e) => updateOption(idx, e.target.value)}
              placeholder={idx === 0 ? 'Oui' : idx === 1 ? 'Non' : `Option ${idx + 1}`}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(idx)} className="p-1 text-red-400 hover:bg-red-500/10 rounded"><X size={14} /></button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <button onClick={addOption} className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 mt-1">
            <Plus size={12} /> Ajouter une option
          </button>
        )}
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Couleur du sticker</label>
        <div className="flex gap-2 flex-wrap">
          {STICKER_COLORS.poll.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...data, colorIndex: idx })}
              className={`w-8 h-8 rounded-full transition ${colorIndex === idx ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{ background: c.gradient }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   QUESTION CONFIG
   ============================================ */
function QuestionConfig({ data, onChange }) {
  const colorIndex = data.colorIndex || 0;
  return (
    <div className="space-y-3">
      <FieldInput label="Question" value={data.question || ''} onChange={(v) => onChange({ ...data, question: v })} placeholder="Posez-moi une question" />
      <div>
        <label className="block text-xs text-gray-400 mb-2">Couleur du sticker</label>
        <div className="flex gap-2 flex-wrap">
          {STICKER_COLORS.question.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...data, colorIndex: idx })}
              className={`w-8 h-8 rounded-full transition ${colorIndex === idx ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{ background: c.gradient }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   SLIDER CONFIG
   ============================================ */
function SliderConfig({ data, onChange }) {
  const colorIndex = data.colorIndex || 0;
  return (
    <div className="space-y-3">
      <FieldInput label="Question" value={data.question || ''} onChange={(v) => onChange({ ...data, question: v })} />
      <FieldInput label="Emoji" value={data.emoji || '\ud83d\ude0d'} onChange={(v) => onChange({ ...data, emoji: v })} />
      <div>
        <label className="block text-xs text-gray-400 mb-2">Couleur du curseur</label>
        <div className="flex gap-2 flex-wrap">
          {STICKER_COLORS.slider.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...data, colorIndex: idx })}
              className={`w-8 h-8 rounded-full transition ${colorIndex === idx ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{ background: c.trackGradient }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   COUNTDOWN CONFIG
   ============================================ */
function CountdownConfig({ data, onChange }) {
  const colorIndex = data.colorIndex || 0;
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={data.title || ''} onChange={(v) => onChange({ ...data, title: v })} />
      <div>
        <label className="block text-xs text-gray-400 mb-1">Date/Heure</label>
        <input type="datetime-local" value={data.endTime || ''} onChange={(e) => onChange({ ...data, endTime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" style={{ colorScheme: 'dark' }} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-2">Couleur du sticker</label>
        <div className="flex gap-2 flex-wrap">
          {STICKER_COLORS.countdown.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...data, colorIndex: idx })}
              className={`w-8 h-8 rounded-full transition ${colorIndex === idx ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{ background: c.gradient }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   LOCATION CONFIG
   ============================================ */
function LocationConfig({ data, onChange }) {
  const colorIndex = data.colorIndex || 0;
  return (
    <div className="space-y-3">
      <FieldInput label="Lieu" value={data.location || ''} onChange={(v) => onChange({ ...data, location: v })} placeholder="Paris, France" />
      <div>
        <label className="block text-xs text-gray-400 mb-2">Style (cliquez pour changer)</label>
        <div className="flex gap-2 flex-wrap">
          {STICKER_COLORS.location.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...data, colorIndex: idx })}
              className={`w-8 h-8 rounded-full border transition ${colorIndex === idx ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: c.bg === 'transparent' ? '#333' : c.bg, borderColor: c.bg === 'transparent' ? '#FFF' : 'transparent' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   NOTIFICATION CONFIG
   ============================================ */
function NotificationConfig({ data, onChange }) {
  const colorIndex = data.colorIndex || 0;
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={data.title || ''} onChange={(v) => onChange({ ...data, title: v })} placeholder="Mon \u00e9v\u00e9nement" />
      <div>
        <label className="block text-xs text-gray-400 mb-2">Couleur du sticker</label>
        <div className="flex gap-2 flex-wrap">
          {STICKER_COLORS.notification.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...data, colorIndex: idx })}
              className={`w-8 h-8 rounded-full transition ${colorIndex === idx ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{ background: c.gradient }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   SMALL COMPONENTS
   ============================================ */
function FieldInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
      />
    </div>
  );
}

function StickerBtn({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-white text-sm"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ============================================
   STICKER RENDERER — Instagram-identical stickers
   ============================================ */
function StickerRenderer({ sticker, isSelected, onSelect, onDragStart, onUpdateData }) {
  let content = null;

  // Helper: cycle color on click of the small circle
  const cycleColor = (colorType) => {
    const colors = STICKER_COLORS[colorType] || [];
    const currentIdx = sticker.data.colorIndex || 0;
    const nextIdx = (currentIdx + 1) % colors.length;
    onUpdateData({ ...sticker.data, colorIndex: nextIdx });
  };

  /* ---- POLL STICKER ---- */
  if (sticker.type === 'poll') {
    const options = sticker.data.options || ['Oui', 'Non'];
    const colorIdx = sticker.data.colorIndex || 0;
    const scheme = STICKER_COLORS.poll[colorIdx] || STICKER_COLORS.poll[0];

    content = (
      <div className="relative" style={{ width: '200px' }}>
        {/* Color cycle circle */}
        <ColorCircle colorIndex={colorIdx} colors={STICKER_COLORS.poll} onChange={(idx) => onUpdateData({ ...sticker.data, colorIndex: idx })} />
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: scheme.gradient }}>
          {/* Question area */}
          <div className="px-4 pt-5 pb-2">
            <div className="bg-white/20 rounded-xl px-3 py-2.5 text-center">
              <p className="text-white text-xs font-semibold uppercase tracking-wide opacity-80">
                {sticker.data.question || 'POSEZ UNE QUESTION...'}
              </p>
            </div>
          </div>
          {/* Options */}
          <div className="px-3 pb-3 flex flex-col gap-1.5">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="bg-white text-center text-sm font-bold py-2.5 rounded-xl cursor-default"
                style={{ color: '#262626' }}
              >
                {typeof opt === 'string' ? (opt || (idx === 0 ? 'Oui' : 'Non')) : opt.text || `Option ${idx + 1}`}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---- QUESTION (FAQ) STICKER ---- */
  else if (sticker.type === 'question') {
    const colorIdx = sticker.data.colorIndex || 0;
    const scheme = STICKER_COLORS.question[colorIdx] || STICKER_COLORS.question[0];

    content = (
      <div className="relative" style={{ width: '200px' }}>
        <ColorCircle colorIndex={colorIdx} colors={STICKER_COLORS.question} onChange={(idx) => onUpdateData({ ...sticker.data, colorIndex: idx })} />
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: scheme.gradient }}>
          <div className="px-4 pt-5 pb-3">
            {/* Title */}
            <p className="text-center text-sm font-bold text-white mb-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {sticker.data.question || 'Posez-moi une question'}
            </p>
            {/* Input field */}
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: scheme.inputBg }}>
              <p className="text-white/50 text-xs text-center">\u00c9crivez quelque chose...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- SLIDER STICKER ---- */
  else if (sticker.type === 'slider') {
    const colorIdx = sticker.data.colorIndex || 0;
    const scheme = STICKER_COLORS.slider[colorIdx] || STICKER_COLORS.slider[0];

    content = (
      <div className="relative" style={{ width: '200px' }}>
        <ColorCircle colorIndex={colorIdx} colors={STICKER_COLORS.slider} onChange={(idx) => onUpdateData({ ...sticker.data, colorIndex: idx })} />
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: scheme.bg }}>
          <div className="px-4 pt-5 pb-4">
            <p className="text-center text-sm font-bold mb-4" style={{ color: scheme.textColor }}>
              {sticker.data.question || 'Question ?'}
            </p>
            {/* Slider track */}
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div className="absolute h-2 rounded-full" style={{ width: '55%', background: scheme.trackGradient }} />
              <div className="absolute text-xl" style={{ left: '55%', top: '-14px', transform: 'translateX(-50%)' }}>
                {sticker.data.emoji || '\ud83d\ude0d'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- COUNTDOWN STICKER ---- */
  else if (sticker.type === 'countdown') {
    const colorIdx = sticker.data.colorIndex || 0;
    const scheme = STICKER_COLORS.countdown[colorIdx] || STICKER_COLORS.countdown[0];

    content = (
      <div className="relative" style={{ width: '210px' }}>
        <ColorCircle colorIndex={colorIdx} colors={STICKER_COLORS.countdown} onChange={(idx) => onUpdateData({ ...sticker.data, colorIndex: idx })} />
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: scheme.gradient }}>
          <div className="px-3 pt-5 pb-3 text-center">
            {/* Title */}
            <p className="text-white text-xs font-bold uppercase tracking-widest mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {sticker.data.title || '\u00c9v\u00e9nement'}
            </p>
            {/* Timer display */}
            <div className="flex justify-center items-end gap-1 text-white">
              <div className="text-center">
                <div className="text-2xl font-mono font-black leading-none">00</div>
                <div className="text-[9px] font-semibold opacity-70 mt-0.5">JOURS</div>
              </div>
              <span className="text-xl font-bold pb-3 opacity-70">:</span>
              <div className="text-center">
                <div className="text-2xl font-mono font-black leading-none">00</div>
                <div className="text-[9px] font-semibold opacity-70 mt-0.5">HEURES</div>
              </div>
              <span className="text-xl font-bold pb-3 opacity-70">:</span>
              <div className="text-center">
                <div className="text-2xl font-mono font-black leading-none">00</div>
                <div className="text-[9px] font-semibold opacity-70 mt-0.5">MIN</div>
              </div>
              <span className="text-xl font-bold pb-3 opacity-70">:</span>
              <div className="text-center">
                <div className="text-2xl font-mono font-black leading-none">00</div>
                <div className="text-[9px] font-semibold opacity-70 mt-0.5">SEC</div>
              </div>
            </div>
            {/* Rappel button */}
            <div className="mt-2 bg-white/20 rounded-full px-4 py-1.5 inline-flex items-center gap-1.5">
              <Bell size={12} className="text-white" />
              <span className="text-white text-[10px] font-semibold">Rappel</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- LOCATION STICKER ---- */
  else if (sticker.type === 'location') {
    const colorIdx = sticker.data.colorIndex || 0;
    const scheme = STICKER_COLORS.location[colorIdx] || STICKER_COLORS.location[0];
    const isTransparent = scheme.bg === 'transparent';

    content = (
      <div
        className="rounded-full px-4 py-2 flex items-center gap-2 shadow-xl cursor-pointer"
        style={{
          backgroundColor: isTransparent ? 'transparent' : scheme.bg,
          border: isTransparent ? '2px solid #FFFFFF' : 'none',
          backdropFilter: scheme.bg.includes('rgba') ? 'blur(8px)' : undefined
        }}
        onClick={(e) => { e.stopPropagation(); cycleColor('location'); }}
      >
        <MapPin size={14} style={{ color: scheme.icon }} />
        <span className="text-sm font-bold" style={{ color: scheme.text }}>
          {sticker.data.location || 'Paris, France'}
        </span>
      </div>
    );
  }

  /* ---- NOTIFICATION STICKER ---- */
  else if (sticker.type === 'notification') {
    const colorIdx = sticker.data.colorIndex || 0;
    const scheme = STICKER_COLORS.notification[colorIdx] || STICKER_COLORS.notification[0];

    content = (
      <div className="relative" style={{ width: '200px' }}>
        <ColorCircle colorIndex={colorIdx} colors={STICKER_COLORS.notification} onChange={(idx) => onUpdateData({ ...sticker.data, colorIndex: idx })} />
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: scheme.gradient }}>
          <div className="px-4 pt-5 pb-3 text-center">
            <Bell size={20} className="mx-auto mb-2 text-white" />
            <p className="text-white text-xs font-bold mb-1">{sticker.data.title || 'Mon \u00e9v\u00e9nement'}</p>
            <div className="bg-white/20 rounded-full px-4 py-2 mt-2">
              <span className="text-white text-xs font-semibold">Activer les notifications</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- POLAROID STICKER ---- */
  else if (sticker.type === 'polaroid') {
    content = (
      <div className="shadow-xl" style={{ width: '140px' }}>
        <div className="bg-white rounded-sm p-1.5 pb-8" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {/* Photo area */}
          <div className="bg-gray-200 aspect-square rounded-sm flex items-center justify-center">
            <Camera size={24} className="text-gray-400" />
          </div>
          {/* Caption */}
          <p className="text-center text-xs text-gray-600 mt-2 font-medium" style={{ fontFamily: "'Segoe UI', sans-serif" }}>
            {sticker.data.caption || ''}
          </p>
        </div>
      </div>
    );
  }

  /* ---- LINK STICKER ---- */
  else if (sticker.type === 'link') {
    content = (
      <div className="bg-white/95 text-gray-800 rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-2 shadow-xl">
        <LinkIcon size={16} className="text-gray-600" />
        {sticker.data.text || 'Lien'}
      </div>
    );
  }

  /* ---- MENTION STICKER ---- */
  else if (sticker.type === 'mention') {
    content = (
      <div className="bg-white/30 backdrop-blur-md text-white rounded-full px-4 py-2 text-sm font-bold shadow-lg border border-white/20">
        @{sticker.data.username || 'username'}
      </div>
    );
  }

  /* ---- HASHTAG STICKER ---- */
  else if (sticker.type === 'hashtag') {
    content = (
      <div className="bg-white/30 backdrop-blur-md text-white rounded-full px-4 py-2 text-sm font-bold shadow-lg border border-white/20">
        #{sticker.data.hashtag || 'hashtag'}
      </div>
    );
  }

  return (
    <div
      className={`absolute cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-pink-400 ring-offset-2 ring-offset-transparent rounded-2xl' : ''}`}
      style={{
        left: `${sticker.position.x * 100}%`,
        top: `${sticker.position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 50 : 10
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={onDragStart}
    >
      {content}
    </div>
  );
}

/* ============================================
   STORIES LIST VIEW
   ============================================ */
function StoriesListView({ stories, accounts, onEdit, onDelete, onGoBack, filter, onFilterChange, accountFilter, onAccountFilterChange }) {
  const filtered = stories.filter(story => {
    const matchF = !filter || (filter === 'pending' && ['draft', 'scheduled'].includes(story.status)) || (filter === 'published' && story.status === 'published');
    const matchA = accountFilter === 'all' || story.account_id === accountFilter;
    return matchF && matchA;
  });

  const statusMap = {
    draft: { label: 'Brouillon', color: 'bg-gray-600' },
    scheduled: { label: 'Programm\u00e9', color: 'bg-blue-600' },
    publishing: { label: 'Publication...', color: 'bg-yellow-600' },
    published: { label: 'Publi\u00e9', color: 'bg-green-600' },
    failed: { label: '\u00c9chou\u00e9', color: 'bg-red-600' }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={onGoBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition">
            <ArrowLeft size={20} /> Retour
          </button>
          <h1 className="text-3xl font-bold">Mes stories</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 flex-wrap items-center">
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button onClick={() => onFilterChange('pending')} className={`px-4 py-2 rounded-md text-sm transition ${filter === 'pending' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-white'}`}>
              En attente
            </button>
            <button onClick={() => onFilterChange('published')} className={`px-4 py-2 rounded-md text-sm transition ${filter === 'published' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-white'}`}>
              Publi\u00e9es
            </button>
          </div>

          <select
            value={accountFilter}
            onChange={(e) => onAccountFilterChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all">Tous les comptes</option>
            {accounts.map(a => <option key={a.id} value={a.id}>@{a.username}</option>)}
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-gray-400">Aucune story trouv\u00e9e.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(story => (
              <div key={story.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/8 transition">
                <div className="aspect-[9/16] max-h-48 bg-black relative overflow-hidden">
                  {story.media_url && <img src={story.media_url} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${statusMap[story.status]?.color || 'bg-gray-600'}`}>
                      {statusMap[story.status]?.label || story.status}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-bold text-sm mb-1">@{accounts.find(a => a.id === story.account_id)?.username || '?'}</p>
                  {story.schedule_time && (
                    <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                      <Clock size={12} /> {new Date(story.schedule_time).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {['draft', 'scheduled'].includes(story.status) && (
                      <>
                        <Button onClick={() => onEdit(story)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1">
                          <Edit3 size={12} /> Modifier
                        </Button>
                        <Button onClick={() => onDelete(story.id)} variant="ghost" className="text-red-400 hover:bg-red-500/10 px-2">
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                    {story.status === 'published' && (
                      <Button onClick={() => onDelete(story.id)} variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs w-full gap-1">
                        <Trash2 size={12} /> Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
