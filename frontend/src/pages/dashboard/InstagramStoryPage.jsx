import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Upload, Link as LinkIcon, Hash, AtSign, BarChart2,
  HelpCircle, Timer, Sliders, Type, Plus, Trash2, ChevronUp, ChevronDown,
  X, Image as ImageIcon, Loader2, Check, Calendar, Clock, Send, RefreshCw,
  Eye, Edit3, Filter, ChevronDown as ChevronDownIcon
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
  { name: 'Classique', family: 'Georgia, serif' },
  { name: 'Moderne', family: 'Segoe UI, sans-serif' },
  { name: 'Néon', family: 'Impact, sans-serif', weight: 'bold' },
  { name: 'Machine à écrire', family: 'Courier New, monospace' },
  { name: 'Strong', family: 'Arial, sans-serif', weight: 'bold' }
];

const COLORS = ['#FFFFFF', '#000000', '#FF0000', '#FFD700', '#FF1493', '#800080', '#0000FF', '#00AA00', '#FFA500'];

// Main component
export default function InstagramStoryPage() {
  const [view, setView] = useState('accounts'); // 'accounts', 'editor', 'stories'
  const [accounts, setAccounts] = useState([]);
  const [stories, setStories] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [storiesFilter, setStoriesFilter] = useState('pending');
  const [storiesAccountFilter, setStoriesAccountFilter] = useState('all');

  // Editor state
  const [editorMode, setEditorMode] = useState('new'); // 'new' or 'edit'
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

  // Drag state
  const dragStateRef = useRef({
    isDragging: false,
    draggedStickerId: null,
    offsetX: 0,
    offsetY: 0
  });

  // Load accounts on mount
  useEffect(() => {
    if (view === 'accounts' || view === 'stories') {
      loadAccounts();
    }
  }, [view]);

  // Load stories when view changes to stories
  useEffect(() => {
    if (view === 'stories') {
      loadStories();
    }
  }, [view, storiesFilter, storiesAccountFilter]);

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      toast.error('Erreur lors du chargement des comptes');
    }
  };

  const loadStories = async () => {
    try {
      const res = await fetch(`${API}/api/instagram-story/drafts`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to load stories');
      const data = await res.json();
      setStories(data.stories || []);
    } catch (err) {
      toast.error('Erreur lors du chargement des stories');
    }
  };

  const addAccount = async () => {
    if (!newAccountUsername.trim()) {
      toast.error('Veuillez entrer un nom de compte');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username: newAccountUsername })
      });
      if (!res.ok) throw new Error('Failed to add account');
      setNewAccountUsername('');
      setShowAddAccountModal(false);
      await loadAccounts();
      toast.success('Compte ajouté avec succès');
    } catch (err) {
      toast.error('Erreur lors de l\'ajout du compte');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete account');
      await loadAccounts();
      toast.success('Compte supprimé');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const startNewStory = (account) => {
    setSelectedAccount(account);
    setEditorMode('new');
    setEditingDraftId(null);
    resetEditor();
    setView('editor');
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
    if (story.schedule_time) {
      setScheduleTime(new Date(story.schedule_time).toISOString().slice(0, 16));
    }
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
  };

  const handleMediaUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/instagram-story/upload`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setMediaUrl(data.url);
      setMediaLocalPath(data.local_path);
      setMediaType(data.media_type);
      toast.success('Média chargé');
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const addSticker = (type) => {
    const newSticker = {
      id: Math.random().toString(36),
      type,
      position: { x: 0.5, y: 0.5 },
      data: {}
    };
    setStickers([...stickers, newSticker]);
    setSelectedSticker(newSticker);
  };

  const updateSelectedSticker = (data) => {
    if (!selectedSticker) return;
    const updated = { ...selectedSticker, data };
    setStickers(stickers.map(s => s.id === selectedSticker.id ? updated : s));
    setSelectedSticker(updated);
  };

  const deleteSelectedSticker = () => {
    if (!selectedSticker) return;
    setStickers(stickers.filter(s => s.id !== selectedSticker.id));
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

  const addTextOverlay = () => {
    if (!tempText.trim()) {
      toast.error('Veuillez entrer du texte');
      return;
    }
    setTextOverlay({
      text: tempText,
      position: { x: 0.5, y: 0.3 },
      color: selectedColor,
      font: selectedFont
    });
    setTempText('');
    toast.success('Texte ajouté');
  };

  const publishStory = async (publish = true) => {
    if (!mediaUrl) {
      toast.error('Veuillez ajouter une image ou vidéo');
      return;
    }
    if (!selectedAccount) {
      toast.error('Veuillez sélectionner un compte');
      return;
    }

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
        elements: stickers.map(s => ({
          type: s.type,
          position: s.position,
          data: s.data
        }))
      };

      let draftUrl = `${API}/api/instagram-story/drafts`;
      let method = 'POST';

      if (editorMode === 'edit' && editingDraftId) {
        draftUrl = `${API}/api/instagram-story/drafts/${editingDraftId}`;
        method = 'PUT';
      }

      const draftRes = await fetch(draftUrl, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!draftRes.ok) throw new Error('Failed to save draft');
      const draftData = await draftRes.json();
      const draftId = draftData.draft_id || draftData.id;

      if (publish && scheduleTime === '') {
        const pubRes = await fetch(`${API}/api/instagram-story/drafts/${draftId}/publish`, {
          method: 'POST',
          headers: getHeaders()
        });
        if (!pubRes.ok) throw new Error('Failed to publish');
        toast.success('Story publiée');
      } else if (scheduleTime) {
        toast.success('Story programmée');
      } else {
        toast.success('Brouillon enregistré');
      }

      resetEditor();
      setView('accounts');
    } catch (err) {
      toast.error('Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  // Render different views
  if (view === 'accounts') {
    return <AccountsView accounts={accounts} onStartStory={startNewStory} onDeleteAccount={deleteAccount} onAddAccount={() => setShowAddAccountModal(true)} onViewStories={() => setView('stories')} showAddModal={showAddAccountModal} onAddModalChange={setShowAddAccountModal} onUsernameChange={setNewAccountUsername} onAddSubmit={addAccount} username={newAccountUsername} isLoading={loading} />;
  }

  if (view === 'editor') {
    return <EditorView selectedAccount={selectedAccount} mediaUrl={mediaUrl} mediaType={mediaType} onMediaUpload={handleMediaUpload} stickers={stickers} selectedSticker={selectedSticker} onSelectSticker={setSelectedSticker} onAddSticker={addSticker} onUpdateSticker={updateSelectedSticker} onDeleteSticker={deleteSelectedSticker} onMoveSticker={moveSelectedSticker} textOverlay={textOverlay} onTextOverlayChange={setTextOverlay} tempText={tempText} onTempTextChange={setTempText} selectedFont={selectedFont} onFontChange={setSelectedFont} selectedColor={selectedColor} onColorChange={setSelectedColor} onAddText={addTextOverlay} scheduleTime={scheduleTime} onScheduleTimeChange={setScheduleTime} onPublish={() => publishStory(!scheduleTime)} onGoBack={() => { setView('accounts'); resetEditor(); }} isLoading={loading} />;
  }

  if (view === 'stories') {
    return <StoriesListView stories={stories} accounts={accounts} onEdit={editStory} onDelete={async (id) => { await fetch(`${API}/api/instagram-story/drafts/${id}`, { method: 'DELETE', headers: getHeaders() }); await loadStories(); toast.success('Supprimée'); }} onGoBack={() => setView('accounts')} filter={storiesFilter} onFilterChange={setStoriesFilter} accountFilter={storiesAccountFilter} onAccountFilterChange={setStoriesAccountFilter} />;
  }
}

// ACCOUNTS VIEW
function AccountsView({ accounts, onStartStory, onDeleteAccount, onAddAccount, onViewStories, showAddModal, onAddModalChange, onUsernameChange, onAddSubmit, username, isLoading }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
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
              <Button onClick={onViewStories} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Mes stories
              </Button>
              <Button onClick={onAddAccount} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
                <Plus size={18} /> Ajouter compte
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <p className="text-gray-400">Aucun compte enregistré. Ajoutez-en un pour commencer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(account => (
                <div key={account.id} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition">
                  <h3 className="text-xl font-bold mb-2">@{account.username}</h3>
                  <p className="text-gray-400 text-sm mb-4">Compte Instagram • {account.stories_count || 0} stories</p>
                  <div className="flex gap-2">
                    <Button onClick={() => onStartStory(account)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm">
                      Tester
                    </Button>
                    <Button onClick={() => onDeleteAccount(account.id)} variant="destructive" className="flex-1">
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {accounts.length > 0 && (
          <div className="text-center">
            <Button onClick={() => onStartStory(accounts[0])} className="bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white text-lg px-8 py-6 gap-2">
              <Plus size={20} /> Créer une story
            </Button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 max-w-sm">
            <h3 className="text-xl font-bold mb-4">Ajouter un compte</h3>
            <Input placeholder="Nom du compte (ex: @moncompte)" value={username} onChange={(e) => onUsernameChange(e.target.value)} className="mb-2 bg-white/5 border-white/10 text-white placeholder-gray-500" />
            <p className="text-xs text-gray-400 mb-4">Le compte doit être déjà connecté sur Instagram dans BlueStacks.</p>
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

// EDITOR VIEW
function EditorView({ selectedAccount, mediaUrl, mediaType, onMediaUpload, stickers, selectedSticker, onSelectSticker, onAddSticker, onUpdateSticker, onDeleteSticker, onMoveSticker, textOverlay, onTextOverlayChange, tempText, onTempTextChange, selectedFont, onFontChange, selectedColor, onColorChange, onAddText, scheduleTime, onScheduleTimeChange, onPublish, onGoBack, isLoading }) {
  const uploadRef = useRef(null);
  const previewRef = useRef(null);
  const dragStateRef = useRef({ isDragging: false, draggedStickerId: null, offsetX: 0, offsetY: 0 });

  const handleMediaClick = () => uploadRef.current?.click();

  const handleDragStart = (e, stickerId) => {
    if (e.button !== 0) return;
    dragStateRef.current.isDragging = true;
    dragStateRef.current.draggedStickerId = stickerId;

    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      dragStateRef.current.offsetX = e.clientX - rect.left - (stickers.find(s => s.id === stickerId)?.position.x * rect.width || 0);
      dragStateRef.current.offsetY = e.clientY - rect.top - (stickers.find(s => s.id === stickerId)?.position.y * rect.height || 0);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragStateRef.current.isDragging || !previewRef.current) return;

      const rect = previewRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left - dragStateRef.current.offsetX) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top - dragStateRef.current.offsetY) / rect.height));

      const sticker = stickers.find(s => s.id === dragStateRef.current.draggedStickerId);
      if (sticker) {
        onUpdateSticker({ ...sticker.data, position: { x, y } });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [stickers, onUpdateSticker]);

  const fontStyle = FONTS.find(f => f.name === selectedFont);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Button onClick={onGoBack} variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl">@{selectedAccount?.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="datetime-local" value={scheduleTime} onChange={(e) => onScheduleTimeChange(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm" />
              {scheduleTime && <Check size={18} className="text-green-400" />}
            </div>
            <Button onClick={onPublish} className="bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white gap-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {scheduleTime ? 'Programmer' : 'Publier maintenant'}
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-56 flex flex-col gap-6">
            {/* Upload Zone */}
            <div
              onClick={handleMediaClick}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) onMediaUpload(file);
              }}
              className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition min-h-40 flex flex-col items-center justify-center"
            >
              {mediaUrl ? (
                <div className="w-full">
                  <img src={mediaUrl} alt="Media" className="w-full h-24 object-cover rounded mb-2" />
                  <Button onClick={handleMediaClick} className="w-full bg-white/10 hover:bg-white/20 text-white text-sm">
                    Changer
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Cliquez ou déposez</p>
                  <p className="text-xs text-gray-500">Image ou vidéo</p>
                </div>
              )}
            </div>

            <input ref={uploadRef} type="file" accept="image/*,video/*" onChange={(e) => onMediaUpload(e.target.files?.[0])} className="hidden" />

            {/* Stickers */}
            <div>
              <p className="text-sm font-bold text-gray-300 mb-3">STICKERS</p>
              <div className="flex flex-col gap-2">
                <StickerButton icon={<LinkIcon size={18} />} label="Lien" color="green" onClick={() => onAddSticker('link')} />
                <StickerButton icon={<Hash size={18} />} label="Hashtag" color="blue" onClick={() => onAddSticker('hashtag')} />
                <StickerButton icon={<AtSign size={18} />} label="Mention" color="teal" onClick={() => onAddSticker('mention')} />
                <StickerButton icon={<BarChart2 size={18} />} label="Sondage" color="blue" onClick={() => onAddSticker('poll')} />
                <StickerButton icon={<HelpCircle size={18} />} label="Question FAQ" color="purple" onClick={() => onAddSticker('question')} />
                <StickerButton icon={<Timer size={18} />} label="Compte à rebours" color="gray" onClick={() => onAddSticker('countdown')} />
                <StickerButton icon={<span className="text-lg">😍</span>} label="Curseur" color="purple" onClick={() => onAddSticker('slider')} />
              </div>
            </div>

            {/* Text Section */}
            <div>
              <p className="text-sm font-bold text-gray-300 mb-3">TEXTE</p>
              <div className="flex flex-col gap-3">
                <div>
                  <Input placeholder="Votre texte" value={tempText} onChange={(e) => onTempTextChange(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder-gray-500 text-sm" />
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">Polices</p>
                  <div className="flex flex-col gap-1">
                    {FONTS.map(font => (
                      <button key={font.name} onClick={() => onFontChange(font.name)} className={`text-left px-3 py-2 rounded text-sm transition ${selectedFont === font.name ? 'bg-pink-600/50 border border-pink-400' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`} style={{ fontFamily: font.family, fontWeight: font.weight }}>
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">Couleur</p>
                  <div className="grid grid-cols-5 gap-1">
                    {COLORS.map(color => (
                      <button key={color} onClick={() => onColorChange(color)} className={`w-8 h-8 rounded-full border-2 transition ${selectedColor === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <Button onClick={onAddText} className="w-full bg-pink-600 hover:bg-pink-700 text-white gap-2 text-sm">
                  <Plus size={16} /> Ajouter texte
                </Button>
              </div>
            </div>
          </div>

          {/* Center: Phone Preview */}
          <div className="flex-1 flex justify-center">
            <div ref={previewRef} className="w-96 bg-black rounded-3xl border-8 border-white/20 shadow-2xl overflow-hidden" style={{ aspectRatio: '9/16' }}>
              {/* Instagram Header */}
              <div className="bg-gradient-to-b from-black/20 to-transparent p-3 flex items-center gap-2 border-b border-white/10 relative z-10">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-pink-600" />
                <span className="text-white text-sm font-semibold flex-1">Votre compte</span>
                <span className="text-gray-300 text-xs">20h</span>
              </div>

              {/* Media Background */}
              {mediaUrl && (
                <img src={mediaUrl} alt="Story background" className="w-full h-full object-cover absolute inset-0" style={{ top: '40px', height: 'calc(100% - 80px)' }} />
              )}

              {/* Stickers */}
              <div className="absolute inset-0 top-10 bottom-12 pointer-events-auto">
                {stickers.map(sticker => (
                  <StickerRenderer key={sticker.id} sticker={sticker} isSelected={selectedSticker?.id === sticker.id} onSelect={() => onSelectSticker(sticker)} onDragStart={(e) => handleDragStart(e, sticker.id)} />
                ))}

                {/* Text Overlay */}
                {textOverlay && (
                  <div
                    className={`absolute cursor-move transform -translate-x-1/2 -translate-y-1/2 ${selectedSticker?.id === 'text' ? 'ring-2 ring-red-500' : ''}`}
                    style={{
                      left: `${textOverlay.position.x * 100}%`,
                      top: `${textOverlay.position.y * 100}%`,
                      fontFamily: FONTS.find(f => f.name === textOverlay.font)?.family || 'serif',
                      color: textOverlay.color,
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                      fontSize: '16px',
                      fontWeight: '600',
                      maxWidth: '80%',
                      textAlign: 'center',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word'
                    }}
                    onClick={() => onSelectSticker({ id: 'text', type: 'text' })}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        dragStateRef.current.isDragging = true;
                        dragStateRef.current.draggedStickerId = 'text';
                        if (previewRef.current) {
                          const rect = previewRef.current.getBoundingClientRect();
                          dragStateRef.current.offsetX = e.clientX - rect.left - (textOverlay.position.x * rect.width);
                          dragStateRef.current.offsetY = e.clientY - rect.top - (textOverlay.position.y * rect.height);
                        }
                      }
                    }}
                  >
                    {textOverlay.text}
                  </div>
                )}
              </div>

              {/* Instagram Footer */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex items-center justify-between border-t border-white/10 relative z-10" style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
                <Send size={18} className="text-white" />
                <span className="text-white text-xs">Envoyer un message</span>
                <RefreshCw size={18} className="text-white" />
              </div>
            </div>
          </div>

          {/* Right: Config Panel */}
          {selectedSticker && (
            <div className="w-80 bg-white/5 border border-white/10 rounded-lg p-6 overflow-y-auto max-h-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Modifier le sticker</h3>
                <div className="flex gap-1">
                  <Button onClick={() => onMoveSticker('up')} variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <ChevronUp size={16} />
                  </Button>
                  <Button onClick={() => onMoveSticker('down')} variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <ChevronDown size={16} />
                  </Button>
                  <Button onClick={onDeleteSticker} variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {selectedSticker.type === 'poll' && (
                <ConfigPanel
                  fields={[
                    { label: 'Question', value: selectedSticker.data.question || '', onChange: (question) => onUpdateSticker({ ...selectedSticker.data, question }) },
                    { label: 'Option A', value: selectedSticker.data.optionA || '', onChange: (optionA) => onUpdateSticker({ ...selectedSticker.data, optionA }) },
                    { label: 'Option B', value: selectedSticker.data.optionB || '', onChange: (optionB) => onUpdateSticker({ ...selectedSticker.data, optionB }) }
                  ]}
                />
              )}

              {selectedSticker.type === 'question' && (
                <ConfigPanel
                  fields={[{ label: 'Question', value: selectedSticker.data.question || '', onChange: (question) => onUpdateSticker({ ...selectedSticker.data, question }) }]}
                />
              )}

              {selectedSticker.type === 'link' && (
                <ConfigPanel
                  fields={[
                    { label: 'URL', value: selectedSticker.data.url || '', onChange: (url) => onUpdateSticker({ ...selectedSticker.data, url }) },
                    { label: 'Texte affiché', value: selectedSticker.data.text || '', onChange: (text) => onUpdateSticker({ ...selectedSticker.data, text }) }
                  ]}
                />
              )}

              {selectedSticker.type === 'mention' && (
                <ConfigPanel
                  fields={[{ label: '@Username', value: selectedSticker.data.username || '', onChange: (username) => onUpdateSticker({ ...selectedSticker.data, username }) }]}
                />
              )}

              {selectedSticker.type === 'hashtag' && (
                <ConfigPanel
                  fields={[{ label: '#Hashtag', value: selectedSticker.data.hashtag || '', onChange: (hashtag) => onUpdateSticker({ ...selectedSticker.data, hashtag }) }]}
                />
              )}

              {selectedSticker.type === 'countdown' && (
                <ConfigPanel
                  fields={[
                    { label: 'Titre', value: selectedSticker.data.title || '', onChange: (title) => onUpdateSticker({ ...selectedSticker.data, title }) },
                    { label: 'Date/Heure', type: 'datetime-local', value: selectedSticker.data.endTime || '', onChange: (endTime) => onUpdateSticker({ ...selectedSticker.data, endTime }) }
                  ]}
                />
              )}

              {selectedSticker.type === 'slider' && (
                <ConfigPanel
                  fields={[{ label: 'Question', value: selectedSticker.data.question || '', onChange: (question) => onUpdateSticker({ ...selectedSticker.data, question }) }]}
                />
              )}

              {selectedSticker.type === 'text' && (
                <div className="text-gray-400 text-sm">Glissez pour déplacer le texte</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// CONFIG PANEL
function ConfigPanel({ fields }) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, idx) => (
        <div key={idx}>
          <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
          <input type={field.type || 'text'} value={field.value} onChange={(e) => field.onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm" />
        </div>
      ))}
    </div>
  );
}

// STICKER BUTTON
function StickerButton({ icon, label, color, onClick }) {
  const colorMap = {
    green: 'bg-green-600/20 border-green-500/30 hover:bg-green-600/30',
    blue: 'bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30',
    teal: 'bg-teal-600/20 border-teal-500/30 hover:bg-teal-600/30',
    purple: 'bg-purple-600/20 border-purple-500/30 hover:bg-purple-600/30',
    gray: 'bg-gray-600/20 border-gray-500/30 hover:bg-gray-600/30'
  };

  return (
    <button onClick={onClick} className={`flex items-center gap-2 w-full px-3 py-2 rounded border transition text-white text-sm ${colorMap[color]}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

// STICKER RENDERER
function StickerRenderer({ sticker, isSelected, onSelect, onDragStart }) {
  let content = null;

  if (sticker.type === 'poll') {
    content = (
      <div className="bg-white text-black rounded-2xl p-4 w-40 text-center shadow-lg">
        <p className="text-sm font-bold mb-3 line-clamp-2">{sticker.data.question || 'Question'}</p>
        <div className="flex flex-col gap-2">
          <button className="bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs py-2 rounded-xl font-bold">
            {sticker.data.optionA || 'Oui'}
          </button>
          <button className="bg-gradient-to-r from-red-400 to-red-600 text-white text-xs py-2 rounded-xl font-bold">
            {sticker.data.optionB || 'Non'}
          </button>
        </div>
      </div>
    );
  } else if (sticker.type === 'question') {
    content = (
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl p-4 w-40 shadow-lg">
        <p className="text-sm font-bold mb-3 line-clamp-2">{sticker.data.question || 'Votre question'}</p>
        <input placeholder="Répondre..." className="w-full bg-white/20 text-white text-xs px-3 py-2 rounded placeholder-white/50" readOnly />
      </div>
    );
  } else if (sticker.type === 'link') {
    content = (
      <div className="bg-white text-black rounded-full px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-lg">
        <LinkIcon size={14} />
        {sticker.data.text || 'Lien'}
      </div>
    );
  } else if (sticker.type === 'mention') {
    content = (
      <div className="bg-white/30 backdrop-blur text-white rounded-full px-4 py-2 text-xs font-bold shadow-lg">
        @{sticker.data.username || 'username'}
      </div>
    );
  } else if (sticker.type === 'hashtag') {
    content = (
      <div className="bg-white/30 backdrop-blur text-white rounded-full px-4 py-2 text-xs font-bold shadow-lg">
        #{sticker.data.hashtag || 'hashtag'}
      </div>
    );
  } else if (sticker.type === 'countdown') {
    content = (
      <div className="bg-white text-black rounded-2xl p-4 w-40 text-center shadow-lg">
        <p className="text-sm font-bold mb-2">{sticker.data.title || 'Événement'}</p>
        <p className="text-2xl font-mono font-bold">00:00:00</p>
        <p className="text-xs text-gray-600">Restant</p>
      </div>
    );
  } else if (sticker.type === 'slider') {
    content = (
      <div className="bg-white text-black rounded-2xl p-4 w-40 shadow-lg">
        <p className="text-sm font-bold mb-3 text-center line-clamp-2">{sticker.data.question || 'Question'}</p>
        <div className="flex items-center gap-2">
          <input type="range" min="0" max="100" defaultValue="50" className="flex-1" readOnly />
          <span className="text-xl">😍</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute cursor-move transform -translate-x-1/2 -translate-y-1/2 transition ${isSelected ? 'ring-2 ring-red-500' : ''}`}
      style={{
        left: `${sticker.position.x * 100}%`,
        top: `${sticker.position.y * 100}%`
      }}
      onClick={onSelect}
      onMouseDown={onDragStart}
    >
      {content}
    </div>
  );
}

// STORIES LIST VIEW
function StoriesListView({ stories, accounts, onEdit, onDelete, onGoBack, filter, onFilterChange, accountFilter, onAccountFilterChange }) {
  const filteredStories = stories.filter(story => {
    const matchFilter = !filter || (filter === 'pending' && ['draft', 'scheduled'].includes(story.status)) || (filter === 'published' && story.status === 'published');
    const matchAccount = accountFilter === 'all' || story.account_id === accountFilter;
    return matchFilter && matchAccount;
  });

  const statusLabels = {
    draft: { label: 'Brouillon', color: 'bg-gray-600' },
    scheduled: { label: 'Programmé', color: 'bg-blue-600' },
    publishing: { label: 'En publication', color: 'bg-yellow-600' },
    published: { label: 'Publié', color: 'bg-green-600' },
    failed: { label: 'Échoué', color: 'bg-red-600' }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button onClick={onGoBack} variant="ghost" className="text-white hover:bg-white/10 mb-4 gap-2">
              <ArrowLeft size={20} /> Retour
            </Button>
            <h1 className="text-4xl font-bold mb-2">Mes stories</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <div className="flex gap-2">
            <button onClick={() => onFilterChange('pending')} className={`px-4 py-2 rounded transition ${filter === 'pending' ? 'bg-pink-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
              En attente
            </button>
            <button onClick={() => onFilterChange('published')} className={`px-4 py-2 rounded transition ${filter === 'published' ? 'bg-pink-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
              Publiées
            </button>
          </div>

          <select value={accountFilter} onChange={(e) => onAccountFilterChange(e.target.value)} className="bg-white/5 border border-white/10 rounded px-4 py-2 text-white">
            <option value="all">Tous les comptes</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                @{account.username}
              </option>
            ))}
          </select>
        </div>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
            <p className="text-gray-400">Aucune story trouvée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map(story => (
              <div key={story.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 transition">
                <div className="aspect-video bg-black relative">
                  {story.media_url && <img src={story.media_url} alt="Story" className="w-full h-full object-cover" />}
                </div>
                <div className="p-4">
                  <h3 className="font-bold mb-1">@{accounts.find(a => a.id === story.account_id)?.username}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${statusLabels[story.status]?.color || 'bg-gray-600'}`}>
                      {statusLabels[story.status]?.label || story.status}
                    </span>
                    {story.schedule_time && <span className="text-xs text-gray-400">{new Date(story.schedule_time).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  <div className="flex gap-2">
                    {['draft', 'scheduled'].includes(story.status) && (
                      <>
                        <Button onClick={() => onEdit(story)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm gap-1">
                          <Edit3 size={14} /> Modifier
                        </Button>
                        <Button onClick={() => onDelete(story.id)} variant="destructive" className="flex-1 text-sm">
                          Supprimer
                        </Button>
                      </>
                    )}
                    {story.status === 'published' && (
                      <Button onClick={() => onDelete(story.id)} variant="destructive" className="w-full text-sm">
                        Supprimer
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
