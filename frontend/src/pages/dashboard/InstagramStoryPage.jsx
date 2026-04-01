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
  { name: 'Néon', family: 'Impact, sans-serif', weight: 'bold' },
  { name: 'Machine à écrire', family: 'Courier New, monospace', weight: 'normal' },
  { name: 'Strong', family: 'Arial Black, sans-serif', weight: '900' }
];

const COLORS = ['#FFFFFF', '#000000', '#FF0000', '#FFD700', '#FF1493', '#800080', '#0000FF', '#00AA00', '#FFA500'];

// Instagram sticker color schemes — the small circle at top cycles through these
const STICKER_COLORS = {
  poll: [
    { headerBg: '#262626', circle: '#262626' },
    { headerBg: '#0095F6', circle: '#0095F6' },
    { headerBg: '#00C853', circle: '#00C853' },
    { headerBg: '#FF6F00', circle: '#FF6F00' },
    { headerBg: '#833AB4', circle: '#833AB4' },
    { headerBg: '#FF1744', circle: '#FF1744' },
    { headerBg: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)', circle: '#D93B7A' },
  ],
  question: [
    { gradient: 'linear-gradient(135deg, #D93B7A, #833AB4)', circle: '#D93B7A', inputBg: '#E2E8F0', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #0095F6, #00D4FF)', circle: '#0095F6', inputBg: '#E2E8F0', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #00C853, #64DD17)', circle: '#00C853', inputBg: '#E2E8F0', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #1a1a2e, #333366)', circle: '#1a1a2e', inputBg: 'rgba(255,255,255,0.15)', textColor: '#FFFFFF' },
    { gradient: 'linear-gradient(135deg, #FF6F00, #FFD600)', circle: '#FF6F00', inputBg: '#E2E8F0', textColor: '#FFFFFF' },
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
      setStories(data.drafts || data.stories || []);
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
      toast.success('Compte ajouté');
    } catch { toast.error("Erreur lors de l'ajout du compte"); }
    finally { setLoading(false); }
  };

  const deleteAccount = async (id) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;
    try {
      await fetch(`${API}/api/instagram-story/accounts/${id}`, { method: 'DELETE', headers: getHeaders() });
      await loadAccounts();
      toast.success('Compte supprimé');
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
      toast.success('Média chargé');
    } catch { toast.error("Erreur lors de l'upload du média"); }
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
      slider: { question: '', emoji: '😍', colorIndex: 0 },
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
    toast.success('Texte ajouté');
  };

  const publishStory = async (publish = true) => {
    if (!mediaUrl) { toast.error('Veuillez ajouter une image ou vidéo'); return; }
    if (!selectedAccount) { toast.error('Veuillez sélectionner un compte'); return; }

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
        text_bg_mode: textOverlay?.bgMode || 'none',
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
          const errMsg = pubData.error || pubData.detail || pubData.message || 'Échec de la publication';
          toast.error(`Publication échouée : ${errMsg}`);
          setLoading(false);
          return;
        }
        toast.success('Story publiée !');
      } else if (scheduleTime) {
        toast.success('Story programmée !');
      } else {
        toast.success('Brouillon enregistré');
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
          toast.success('Supprimée');
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
    <div className="min-h-screen bg-slate-50 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Instagram Stories</h1>
          <p className="text-gray-400">Gérez vos comptes et créez vos stories</p>
        </div>

        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-8 flex items-center gap-3">
          <Check size={20} className="text-green-400" />
          <span className="text-green-400">BlueStacks connecté — publication automatique prête</span>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Comptes enregistrés</h2>
            <div className="flex gap-4">
              <Button onClick={onViewAllStories} variant="outline" className="border-slate-200 text-slate-900 hover:bg-slate-100 gap-2">
                <Eye size={18} /> Toutes les stories
              </Button>
              <Button onClick={onAddAccount} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
                <Plus size={18} /> Ajouter compte
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <p className="text-gray-400">Aucun compte enregistré. Ajoutez-en un pour commencer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(account => (
                <div key={account.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:bg-white/8 transition">
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
                      <Plus size={16} /> Créer
                    </Button>
                    <Button onClick={() => onViewStories(account)} variant="outline" className="flex-1 border-slate-200 text-slate-900 hover:bg-slate-100 text-sm gap-1">
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
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50" onClick={() => onAddModalChange(false)}>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Ajouter un compte</h3>
            <Input
              placeholder="Nom du compte (ex: moncompte)"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddSubmit()}
              className="mb-2 bg-white border-slate-200 text-slate-900 placeholder-gray-500"
            />
            <p className="text-xs text-gray-400 mb-4">Le compte doit être déjà connecté sur Instagram dans BlueStacks.</p>
            <div className="flex gap-2">
              <Button onClick={onAddSubmit} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white" disabled={isLoading}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Ajouter'}
              </Button>
              <Button onClick={() => onAddModalChange(false)} variant="outline" className="flex-1 border-slate-200 text-slate-900 hover:bg-slate-100">
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
    <div className="min-h-screen bg-slate-50 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft size={20} />
            </button>

            {/* Account Selector */}
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-100 transition"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-pink-600 flex items-center justify-center text-xs font-bold">
                  {selectedAccount?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="font-medium">@{selectedAccount?.username || 'Choisir'}</span>
                <ChevronDown size={16} />
              </button>

              {showAccountDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-slate-50 border border-slate-200 rounded-lg shadow-xl z-50 min-w-48 overflow-hidden">
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => { onChangeAccount(acc); setShowAccountDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition text-left ${selectedAccount?.id === acc.id ? 'bg-pink-600/20' : ''}`}
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
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <Clock size={16} className="text-gray-400" />
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => onScheduleTimeChange(e.target.value)}
                className="bg-transparent text-slate-900 text-sm outline-none"
                style={{ colorScheme: 'dark' }}
              />
              {scheduleTime && (
                <button onClick={() => onScheduleTimeChange('')} className="text-gray-400 hover:text-slate-900">
                  <X size={14} />
                </button>
              )}
            </div>

            <Button onClick={onSaveDraft} variant="outline" className="border-slate-200 text-slate-900 hover:bg-slate-100 text-sm">
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
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-pink-400/50 hover:bg-slate-50 transition"
            >
              {mediaUrl ? (
                <div>
                  <img src={mediaUrl} alt="" className="w-full h-20 object-cover rounded-lg mb-2" onError={(e) => { e.target.style.display = 'none'; }} />
                  <p className="text-xs text-gray-400">Cliquez pour changer</p>
                </div>
              ) : (
                <div className="py-4">
                  <Upload size={28} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Image ou vidéo</p>
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
                <StickerBtn icon={<span className="text-sm">😍</span>} label="Curseur" onClick={() => onAddSticker('slider')} />
                <StickerBtn icon={<Timer size={16} />} label="Compte à rebours" onClick={() => onAddSticker('countdown')} />
                <StickerBtn icon={<MapPin size={16} />} label="Localisation" onClick={() => onAddSticker('location')} />
                <StickerBtn icon={<LinkIcon size={16} />} label="Lien" onClick={() => onAddSticker('link')} />
                <StickerBtn icon={<AtSign size={16} />} label="Mention" onClick={() => onAddSticker('mention')} />
                <StickerBtn icon={<Hash size={16} />} label="Hashtag" onClick={() => onAddSticker('hashtag')} />
                <StickerBtn icon={<Bell size={16} />} label="Notification" onClick={() => onAddSticker('notification')} />
                <StickerBtn icon={<Camera size={16} />} label="Polaroïd" onClick={() => onAddSticker('polaroid')} />
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
                  className="bg-white border-slate-200 text-slate-900 placeholder-gray-500 text-sm h-9"
                />

                {/* Text background toggle (framed A) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCycleTextBg}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border-2 transition font-bold text-sm"
                    style={{
                      borderColor: textBgMode === 'none' ? '#CBD5E1' : textBgMode === 'dark' ? '#000' : textBgMode === 'light' ? '#FFF' : selectedColor,
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
                      className={`text-left px-2.5 py-1.5 rounded text-xs transition ${selectedFont === font.name ? 'bg-pink-600/40 border border-pink-400/50' : 'bg-white border border-transparent hover:bg-slate-100'}`}
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

                <Button onClick={onAddText} className="w-full bg-slate-100 hover:bg-white/20 text-slate-900 gap-1 text-xs h-8">
                  <Plus size={14} /> Ajouter texte
                </Button>
              </div>
            </div>
          </div>

          {/* Center: Realistic iPhone Preview */}
          <div className="flex-1 flex justify-center items-start overflow-hidden py-2">
            {/* iPhone outer shell */}
            <div
              className="relative flex-shrink-0"
              style={{
                width: 'min(340px, calc((100vh - 100px) * 9 / 19.5 + 24px))',
                height: 'min(694px, calc(100vh - 100px))',
              }}
            >
              {/* iPhone frame — titanium look */}
              <div
                className="absolute inset-0 rounded-[3rem]"
                style={{
                  background: 'linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 30%, #0f0f12 50%, #1a1a1e 70%, #2a2a2e 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 25px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4), -4px 0 15px rgba(0,0,0,0.3), 4px 0 15px rgba(0,0,0,0.3)',
                }}
              />

              {/* Side buttons — left: silent switch + volume */}
              <div className="absolute -left-[2.5px] top-[15%] w-[3px] h-[8px] rounded-l-sm" style={{ background: 'linear-gradient(180deg, #3a3a3e, #1a1a1e)' }} />
              <div className="absolute -left-[2.5px] top-[20%] w-[3px] h-[28px] rounded-l-sm" style={{ background: 'linear-gradient(180deg, #3a3a3e, #1a1a1e)' }} />
              <div className="absolute -left-[2.5px] top-[27%] w-[3px] h-[28px] rounded-l-sm" style={{ background: 'linear-gradient(180deg, #3a3a3e, #1a1a1e)' }} />
              {/* Side button — right: power */}
              <div className="absolute -right-[2.5px] top-[23%] w-[3px] h-[36px] rounded-r-sm" style={{ background: 'linear-gradient(180deg, #3a3a3e, #1a1a1e)' }} />

              {/* Screen area — inside the frame */}
              <div
                ref={previewRef}
                className="absolute overflow-hidden"
                style={{
                  top: '12px',
                  left: '12px',
                  right: '12px',
                  bottom: '12px',
                  borderRadius: 'calc(3rem - 12px)',
                }}
              >
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
                      <Upload size={40} className="mx-auto mb-2" />
                      <p className="text-xs">Ajoutez un média</p>
                    </div>
                  </div>
                )}

                {/* Dynamic Island */}
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <div
                    className="rounded-full bg-black"
                    style={{
                      width: '120px',
                      height: '34px',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
                    }}
                  />
                </div>

                {/* Status bar */}
                <div className="relative z-20 flex items-center justify-between px-8 text-slate-900" style={{ height: '52px', paddingTop: '14px' }}>
                  <span className="text-xs font-semibold" style={{ fontSize: '13px' }}>9:41</span>
                  <div className="flex items-center gap-[5px]">
                    {/* Signal bars */}
                    <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                      <rect x="0" y="9" width="3" height="3" rx="0.5" fill="white"/>
                      <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="white"/>
                      <rect x="9" y="3" width="3" height="9" rx="0.5" fill="white"/>
                      <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white"/>
                    </svg>
                    {/* WiFi */}
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <path d="M8 11.5a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z" fill="white"/>
                      <path d="M4.7 8.1a4.7 4.7 0 016.6 0" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M2.3 5.5a8 8 0 0111.4 0" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M0 3a11.2 11.2 0 0116 0" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    {/* Battery */}
                    <div className="flex items-center gap-[2px]">
                      <div className="relative" style={{ width: '25px', height: '12px', border: '1.2px solid rgba(255,255,255,0.9)', borderRadius: '3px' }}>
                        <div className="absolute top-[2px] left-[2px] bottom-[2px] rounded-[1.5px] bg-white" style={{ width: '65%' }} />
                      </div>
                      <div className="rounded-r-sm bg-white/90" style={{ width: '1.5px', height: '5px' }} />
                    </div>
                  </div>
                </div>

                {/* Story progress bar */}
                <div className="absolute z-20" style={{ top: '54px', left: '10px', right: '10px', height: '2px' }}>
                  <div className="w-full h-full bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                {/* Instagram Header */}
                <div className="relative z-20 flex items-center px-3 gap-2" style={{ height: '40px', marginTop: '4px' }}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white border-2 border-black/30">
                    {selectedAccount?.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-slate-900 text-[13px] font-semibold flex-1 drop-shadow-lg">{selectedAccount?.username || 'compte'}</span>
                  <span className="text-gray-300 text-[11px] drop-shadow">Il y a 2h</span>
                  <X size={18} className="text-slate-700 ml-1 drop-shadow" />
                </div>

                {/* Sticker Layer — full screen, same as Instagram */}
                <div className="absolute inset-0 z-10">
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
                        fontSize: '16px',
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
                <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full px-4 py-2 flex items-center backdrop-blur-sm" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                      <span className="text-slate-500 text-[11px]">Envoyer un message</span>
                    </div>
                    <Send size={18} className="text-slate-900 drop-shadow" />
                  </div>
                  {/* Home indicator bar */}
                  <div className="flex justify-center mt-2">
                    <div className="w-[100px] h-[4px] bg-white/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Config Panel */}
          <div className="w-72 flex-shrink-0 overflow-y-auto pl-2">
            {selectedSticker ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider">
                    {selectedSticker.type === 'text' ? 'Texte' : `Sticker ${selectedSticker.type}`}
                  </h3>
                  <div className="flex gap-1">
                    {selectedSticker.type !== 'text' && (
                      <>
                        <button onClick={() => onMoveSticker('up')} className="p-1.5 hover:bg-slate-100 rounded"><ChevronUp size={14} /></button>
                        <button onClick={() => onMoveSticker('down')} className="p-1.5 hover:bg-slate-100 rounded"><ChevronDown size={14} /></button>
                        <button onClick={onDeleteSticker} className="p-1.5 hover:bg-red-500/20 rounded text-red-400"><Trash2 size={14} /></button>
                      </>
                    )}
                    {selectedSticker.type === 'text' && textOverlay && (
                      <button onClick={() => { onTextOverlayChange(null); onSelectSticker(null); }} className="p-1.5 hover:bg-red-500/20 rounded text-red-400"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>

                {/* Scale control */}
                {selectedSticker.type !== 'text' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-400">Taille</label>
                      <span className="text-xs text-gray-500">{Math.round((selectedSticker.data?.scale || 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.5"
                      step="0.05"
                      value={selectedSticker.data?.scale || 1}
                      onChange={(e) => onUpdateStickerData({ ...selectedSticker.data, scale: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>
                )}

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
                    <FieldInput label="Légende" value={selectedSticker.data.caption || ''} onChange={(v) => onUpdateStickerData({ ...selectedSticker.data, caption: v })} placeholder="Ajouter une légende..." />
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
                  <p className="text-gray-400 text-sm">Glissez le texte sur l'aperçu pour le déplacer.</p>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">Cliquez sur un sticker dans l'aperçu pour le configurer, ou ajoutez-en un depuis le panneau de gauche.</p>
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
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm"
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
        <label className="block text-xs text-gray-400 mb-2">Couleur de la bannière</label>
        <div className="flex gap-2 flex-wrap">
          {STICKER_COLORS.poll.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...data, colorIndex: idx })}
              className={`w-8 h-8 rounded-full border-2 transition ${colorIndex === idx ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110 border-slate-2000' : 'border-slate-200 opacity-80 hover:opacity-100'}`}
              style={{ background: c.headerBg }}
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
      <FieldInput label="Emoji" value={data.emoji || '😍'} onChange={(v) => onChange({ ...data, emoji: v })} />
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
        <input type="datetime-local" value={data.endTime || ''} onChange={(e) => onChange({ ...data, endTime: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm" style={{ colorScheme: 'dark' }} />
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
      <FieldInput label="Titre" value={data.title || ''} onChange={(v) => onChange({ ...data, title: v })} placeholder="Mon événement" />
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
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm"
      />
    </div>
  );
}

function StickerBtn({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition text-slate-900 text-sm"
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

    const isGradient = scheme.headerBg.includes('gradient');
    content = (
      <div className="relative" style={{ width: '200px' }}>
        {/* Color cycle circle */}
        <ColorCircle colorIndex={colorIdx} colors={STICKER_COLORS.poll} onChange={(idx) => onUpdateData({ ...sticker.data, colorIndex: idx })} />
        <div className="rounded-2xl overflow-hidden shadow-xl">
          {/* Header/Question area — colored part (default: black) */}
          <div
            className="px-4 pt-5 pb-3 text-center"
            style={{ background: isGradient ? scheme.headerBg : scheme.headerBg }}
          >
            <p className="text-slate-900 text-sm font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {sticker.data.question || 'Posez une question...'}
            </p>
          </div>
          {/* Options area — always white */}
          <div className="bg-white px-3 py-3 flex flex-col gap-1.5">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="text-center text-sm font-bold py-2.5 rounded-xl cursor-default border border-gray-200"
                style={{ color: '#262626', backgroundColor: '#F5F5F5' }}
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
            <p className="text-center text-sm font-bold text-slate-900 mb-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {sticker.data.question || 'Posez-moi une question'}
            </p>
            {/* Input field */}
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: scheme.inputBg }}>
              <p className="text-slate-500 text-xs text-center">Écrivez quelque chose...</p>
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
                {sticker.data.emoji || '😍'}
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
            <p className="text-slate-900 text-xs font-bold uppercase tracking-widest mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {sticker.data.title || 'Événement'}
            </p>
            {/* Timer display */}
            <div className="flex justify-center items-end gap-1 text-slate-900">
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
              <Bell size={12} className="text-slate-900" />
              <span className="text-slate-900 text-[10px] font-semibold">Rappel</span>
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
            <Bell size={20} className="mx-auto mb-2 text-slate-900" />
            <p className="text-slate-900 text-xs font-bold mb-1">{sticker.data.title || 'Mon événement'}</p>
            <div className="bg-white/20 rounded-full px-4 py-2 mt-2">
              <span className="text-slate-900 text-xs font-semibold">Activer les notifications</span>
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
      <div className="bg-white/30 backdrop-blur-md text-slate-900 rounded-full px-4 py-2 text-sm font-bold shadow-lg border border-slate-200">
        @{sticker.data.username || 'username'}
      </div>
    );
  }

  /* ---- HASHTAG STICKER ---- */
  else if (sticker.type === 'hashtag') {
    content = (
      <div className="bg-white/30 backdrop-blur-md text-slate-900 rounded-full px-4 py-2 text-sm font-bold shadow-lg border border-slate-200">
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
        transform: `translate(-50%, -50%) scale(${sticker.data.scale || 1})`,
        zIndex: isSelected ? 50 : 10
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={onDragStart}
      onWheel={(e) => {
        e.stopPropagation();
        const currentScale = sticker.data.scale || 1;
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.max(0.4, Math.min(2.5, currentScale + delta));
        onUpdateData({ ...sticker.data, scale: newScale });
      }}
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
    scheduled: { label: 'Programmé', color: 'bg-blue-600' },
    publishing: { label: 'Publication...', color: 'bg-yellow-600' },
    published: { label: 'Publié', color: 'bg-green-600' },
    failed: { label: 'Échoué', color: 'bg-red-600' }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={onGoBack} className="flex items-center gap-2 text-gray-400 hover:text-slate-900 mb-4 transition">
            <ArrowLeft size={20} /> Retour
          </button>
          <h1 className="text-3xl font-bold">Mes stories</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 flex-wrap items-center">
          <div className="flex gap-1 bg-white rounded-lg p-1">
            <button onClick={() => onFilterChange('pending')} className={`px-4 py-2 rounded-md text-sm transition ${filter === 'pending' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-slate-900'}`}>
              En attente
            </button>
            <button onClick={() => onFilterChange('published')} className={`px-4 py-2 rounded-md text-sm transition ${filter === 'published' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-slate-900'}`}>
              Publiées
            </button>
          </div>

          <select
            value={accountFilter}
            onChange={(e) => onAccountFilterChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 text-sm"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all">Tous les comptes</option>
            {accounts.map(a => <option key={a.id} value={a.id}>@{a.username}</option>)}
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-gray-400">Aucune story trouvée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(story => (
              <div key={story.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:bg-white/8 transition">
                <div className="aspect-[9/16] max-h-48 bg-white relative overflow-hidden">
                  {story.media_url && <img src={story.media_url} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-slate-900 ${statusMap[story.status]?.color || 'bg-gray-600'}`}>
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
