import { useState, useEffect, useRef } from "react";
import {
  Instagram, Plus, Image, Video, Type, BarChart2, HelpCircle,
  Clock, Calendar, Send, Trash2, Eye, EyeOff, Settings, User, Lock,
  CheckCircle2, XCircle, Loader2, RefreshCw, X, Move, Hash, AtSign,
  MapPin, MessageCircle, Timer, FileQuestion, Smile, Link2, Bold,
  Italic, AlignLeft, AlignCenter, AlignRight, Palette, GripVertical
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

// Sticker types available
const STICKER_TYPES = [
  { id: 'poll', name: 'Sondage', icon: BarChart2, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  { id: 'question', name: 'Question', icon: MessageCircle, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { id: 'quiz', name: 'Quiz', icon: FileQuestion, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  { id: 'countdown', name: 'Compte à rebours', icon: Timer, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  { id: 'emoji_slider', name: 'Curseur emoji', icon: Smile, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  { id: 'link', name: 'Lien', icon: Link2, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  { id: 'mention', name: '@Mention', icon: AtSign, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  { id: 'hashtag', name: '#Hashtag', icon: Hash, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  { id: 'location', name: 'Lieu', icon: MapPin, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
];

// Font styles
const FONT_STYLES = [
  { id: 'modern', name: 'Modern', fontFamily: 'Inter, sans-serif', fontWeight: '700' },
  { id: 'classic', name: 'Classic', fontFamily: 'Georgia, serif', fontWeight: '400' },
  { id: 'neon', name: 'Neon', fontFamily: 'Pacifico, cursive', fontWeight: '400' },
  { id: 'typewriter', name: 'Typewriter', fontFamily: 'Courier New, monospace', fontWeight: '400' },
  { id: 'strong', name: 'Strong', fontFamily: 'Impact, sans-serif', fontWeight: '700' },
  { id: 'minimal', name: 'Minimal', fontFamily: 'Helvetica, sans-serif', fontWeight: '300' },
];

// Colors for stickers
const STICKER_COLORS = [
  '#ffffff', '#000000', '#ff3b5c', '#ff6b35', '#ffc107', 
  '#4caf50', '#2196f3', '#9c27b0', '#e91e63', '#00bcd4'
];

const InstagramStoryEditor = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  
  // Account form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Editor state
  const [activeTab, setActiveTab] = useState('stickers'); // stickers, text, images
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e');
  const [elements, setElements] = useState([]); // All stickers and text on canvas
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Text editing
  const [currentText, setCurrentText] = useState("");
  const [currentFont, setCurrentFont] = useState(FONT_STYLES[0]);
  const [currentTextColor, setCurrentTextColor] = useState('#ffffff');
  
  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  
  const [publishing, setPublishing] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("alpha_token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0 && !selectedAccount) {
          setSelectedAccount(data.accounts[0]);
        }
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async () => {
    if (!newUsername || !newPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    setSavingAccount(true);
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Compte @${newUsername} ajouté !`);
        setNewUsername("");
        setNewPassword("");
        setShowAddAccount(false);
        loadAccounts();
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error("Format non supporté");
      return;
    }
    
    const url = URL.createObjectURL(file);
    setBackgroundImage(url);
  };

  const addSticker = (stickerType) => {
    const newElement = {
      id: Date.now(),
      type: 'sticker',
      stickerType: stickerType.id,
      name: stickerType.name,
      icon: stickerType.id,
      x: 50, // percentage
      y: 50,
      width: 80,
      color: '#ffffff',
      // Sticker-specific data
      data: getStickerDefaultData(stickerType.id)
    };
    
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const getStickerDefaultData = (type) => {
    switch (type) {
      case 'poll':
        return { question: 'Votre avis ?', options: ['Oui', 'Non'] };
      case 'question':
        return { question: 'Posez-moi une question' };
      case 'quiz':
        return { question: 'Quiz ?', options: ['A', 'B', 'C', 'D'], correct: 0 };
      case 'countdown':
        return { title: 'Bientôt !', endDate: '' };
      case 'emoji_slider':
        return { question: 'À quel point ?', emoji: '🔥' };
      case 'link':
        return { url: '', label: 'En savoir plus' };
      case 'mention':
        return { username: '' };
      case 'hashtag':
        return { tag: '' };
      case 'location':
        return { place: '' };
      default:
        return {};
    }
  };

  const addText = () => {
    if (!currentText.trim()) {
      toast.error("Entrez du texte");
      return;
    }
    
    const newElement = {
      id: Date.now(),
      type: 'text',
      text: currentText,
      x: 50,
      y: 50,
      font: currentFont,
      color: currentTextColor,
      fontSize: 24
    };
    
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
    setCurrentText("");
  };

  const updateElement = (id, updates) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  const handleCanvasMouseDown = (e, elementId) => {
    if (elementId) {
      setSelectedElement(elementId);
      setIsDragging(true);
      
      const rect = canvasRef.current.getBoundingClientRect();
      const element = elements.find(el => el.id === elementId);
      
      setDragOffset({
        x: (e.clientX - rect.left) / rect.width * 100 - element.x,
        y: (e.clientY - rect.top) / rect.height * 100 - element.y
      });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging || !selectedElement) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, (e.clientX - rect.left) / rect.width * 100 - dragOffset.x));
    const y = Math.max(5, Math.min(95, (e.clientY - rect.top) / rect.height * 100 - dragOffset.y));
    
    updateElement(selectedElement, { x, y });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const renderStickerPreview = (element) => {
    const data = element.data;
    
    switch (element.stickerType) {
      case 'poll':
        return (
          <div className="bg-white/95 rounded-2xl p-3 min-w-[200px] shadow-lg">
            <p className="text-gray-900 font-semibold text-sm text-center mb-2">{data.question}</p>
            <div className="space-y-1">
              {data.options.map((opt, i) => (
                <div key={i} className="bg-gray-100 rounded-full px-4 py-2 text-center text-sm text-gray-700">
                  {opt}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'question':
        return (
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-3 min-w-[200px] shadow-lg">
            <p className="text-white font-semibold text-sm text-center mb-2">{data.question}</p>
            <div className="bg-white/90 rounded-full px-4 py-2 text-center text-sm text-gray-400">
              Tapez votre réponse...
            </div>
          </div>
        );
      
      case 'quiz':
        return (
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-3 min-w-[200px] shadow-lg">
            <p className="text-white font-semibold text-sm text-center mb-2">{data.question}</p>
            <div className="grid grid-cols-2 gap-1">
              {data.options.map((opt, i) => (
                <div key={i} className="bg-white/20 rounded-lg px-2 py-1 text-center text-xs text-white">
                  {opt}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'countdown':
        return (
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-3 min-w-[180px] shadow-lg text-center">
            <p className="text-white font-bold text-sm">{data.title}</p>
            <div className="flex justify-center gap-2 mt-2">
              <div className="bg-white/20 rounded px-2 py-1 text-white text-xs">00j</div>
              <div className="bg-white/20 rounded px-2 py-1 text-white text-xs">00h</div>
              <div className="bg-white/20 rounded px-2 py-1 text-white text-xs">00m</div>
            </div>
          </div>
        );
      
      case 'emoji_slider':
        return (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-3 min-w-[200px] shadow-lg">
            <p className="text-white font-semibold text-sm text-center mb-2">{data.question}</p>
            <div className="bg-white/30 rounded-full h-2 relative">
              <div className="absolute -top-3 left-1/2 text-xl">{data.emoji}</div>
            </div>
          </div>
        );
      
      case 'link':
        return (
          <div className="bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-700" />
            <span className="text-gray-900 text-sm font-medium">{data.label || 'Voir le lien'}</span>
          </div>
        );
      
      case 'mention':
        return (
          <div className="bg-white/90 rounded-full px-4 py-2 shadow-lg">
            <span className="text-gray-900 text-sm font-medium">@{data.username || 'username'}</span>
          </div>
        );
      
      case 'hashtag':
        return (
          <div className="bg-white/90 rounded-full px-4 py-2 shadow-lg">
            <span className="text-gray-900 text-sm font-medium">#{data.tag || 'hashtag'}</span>
          </div>
        );
      
      case 'location':
        return (
          <div className="bg-white/90 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-gray-900 text-sm font-medium">{data.place || 'Lieu'}</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  const publishStory = async () => {
    if (!selectedAccount) {
      toast.error("Sélectionnez un compte");
      return;
    }
    
    if (!backgroundImage) {
      toast.error("Ajoutez une image de fond");
      return;
    }
    
    setPublishing(true);
    
    try {
      // Create draft with all elements
      const draftData = {
        account_id: selectedAccount.id,
        media_url: backgroundImage,
        media_type: 'image',
        background_color: backgroundColor,
        elements: elements,
        schedule_time: scheduleEnabled && scheduleDate && scheduleTime 
          ? `${scheduleDate}T${scheduleTime}:00` 
          : null
      };
      
      const res = await fetch(`${API}/api/instagram-story/drafts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(draftData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(scheduleEnabled ? "Story programmée !" : "Brouillon créé !");
        // Reset editor
        setElements([]);
        setBackgroundImage(null);
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setPublishing(false);
    }
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Instagram className="w-8 h-8 text-pink-500" />
            <h1 className="text-xl font-bold text-white">Story Editor</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Account Selector */}
            <select
              value={selectedAccount?.id || ""}
              onChange={(e) => setSelectedAccount(accounts.find(a => a.id === e.target.value))}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
            >
              <option value="" className="bg-gray-900">Sélectionner un compte</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-gray-900">@{acc.username}</option>
              ))}
            </select>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAddAccount(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Compte
            </Button>
            
            {/* Schedule Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="schedule"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="schedule" className="text-white/70 text-sm">Programmer</label>
            </div>
            
            {scheduleEnabled && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-36 bg-white/10 border-white/20 text-white text-sm"
                />
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-24 bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
            )}
            
            <Button
              onClick={publishStory}
              disabled={publishing || !backgroundImage}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {scheduleEnabled ? 'Programmer' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Stickers & Tools */}
        <div className="w-64 border-r border-white/10 p-4 overflow-y-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('stickers')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'stickers' ? 'bg-pink-500 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              Stickers
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'text' ? 'bg-pink-500 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              Texte
            </button>
          </div>

          {activeTab === 'stickers' && (
            <div className="space-y-2">
              <p className="text-white/50 text-xs uppercase mb-3">Cliquez pour ajouter</p>
              {STICKER_TYPES.map((sticker) => {
                const Icon = sticker.icon;
                return (
                  <button
                    key={sticker.id}
                    onClick={() => addSticker(sticker)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg ${sticker.bgColor} hover:scale-[1.02] transition-transform cursor-pointer`}
                  >
                    <Icon className={`w-5 h-5 ${sticker.color}`} />
                    <span className="text-white text-sm font-medium">{sticker.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-xs block mb-2">Votre texte</label>
                <Input
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder="Entrez votre texte..."
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <label className="text-white/70 text-xs block mb-2">Style de police</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_STYLES.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setCurrentFont(font)}
                      className={`p-2 rounded-lg text-sm transition-all ${
                        currentFont.id === font.id 
                          ? 'bg-pink-500 text-white' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                      style={{ fontFamily: font.fontFamily }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-white/70 text-xs block mb-2">Couleur</label>
                <div className="flex flex-wrap gap-2">
                  {STICKER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setCurrentTextColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        currentTextColor === color ? 'border-pink-500 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <Button onClick={addText} className="w-full bg-pink-600 hover:bg-pink-500">
                <Type className="w-4 h-4 mr-2" />
                Ajouter le texte
              </Button>
            </div>
          )}
        </div>

        {/* Center - Story Preview Canvas */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0d0d12]">
          <div className="relative">
            {/* Phone Frame */}
            <div className="relative w-[300px] h-[600px] bg-white rounded-[40px] p-2 shadow-2xl">
              {/* Screen */}
              <div
                ref={canvasRef}
                className="relative w-full h-full rounded-[32px] overflow-hidden cursor-crosshair"
                style={{ backgroundColor }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onClick={() => setSelectedElement(null)}
              >
                {/* Background Image */}
                {backgroundImage ? (
                  <img
                    src={backgroundImage}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <Image className="w-12 h-12 text-white/30 mx-auto mb-2" />
                      <p className="text-white/50 text-sm">Cliquez pour ajouter</p>
                      <p className="text-white/30 text-xs">une image de fond</p>
                    </div>
                  </div>
                )}
                
                {/* Story Header Mock */}
                <div className="absolute top-4 left-4 right-4 flex items-center gap-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500" />
                  <span className="text-white text-sm font-medium drop-shadow">
                    {selectedAccount?.username || 'username'}
                  </span>
                  <span className="text-white/60 text-xs ml-1">5min</span>
                </div>
                
                {/* Progress Bar */}
                <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/30 rounded z-10">
                  <div className="h-full w-1/3 bg-white rounded" />
                </div>
                
                {/* Elements on Canvas */}
                {elements.map((element) => (
                  <div
                    key={element.id}
                    className={`absolute cursor-move transition-all ${
                      selectedElement === element.id ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-transparent' : ''
                    }`}
                    style={{
                      left: `${element.x}%`,
                      top: `${element.y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: selectedElement === element.id ? 50 : 10
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); handleCanvasMouseDown(e, element.id); }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {element.type === 'sticker' && renderStickerPreview(element)}
                    
                    {element.type === 'text' && (
                      <p
                        className="px-2 py-1 whitespace-nowrap drop-shadow-lg"
                        style={{
                          fontFamily: element.font.fontFamily,
                          fontWeight: element.font.fontWeight,
                          color: element.color,
                          fontSize: `${element.fontSize}px`
                        }}
                      >
                        {element.text}
                      </p>
                    )}
                    
                    {/* Delete button */}
                    {selectedElement === element.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                ))}
                
                {/* Bottom - Message Mock */}
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
                      <span className="text-white/60 text-sm">Envoyer un message</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Change background button */}
            {backgroundImage && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full text-white/70 text-sm hover:bg-white/20 transition-colors"
              >
                <Image className="w-4 h-4 inline mr-2" />
                Changer l'image
              </button>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleBackgroundUpload}
            className="hidden"
          />
        </div>

        {/* Right Panel - Element Properties */}
        <div className="w-72 border-l border-white/10 p-4 overflow-y-auto">
          <h3 className="text-white font-semibold mb-4">Propriétés</h3>
          
          {selectedEl ? (
            <div className="space-y-4">
              {/* Element Type Header */}
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white/50 text-xs uppercase">Type</p>
                <p className="text-white font-medium">
                  {selectedEl.type === 'sticker' ? selectedEl.name : 'Texte'}
                </p>
              </div>
              
              {/* Position */}
              <div>
                <p className="text-white/50 text-xs uppercase mb-2">Position</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/40 text-xs">X</label>
                    <Input
                      type="number"
                      value={Math.round(selectedEl.x)}
                      onChange={(e) => updateElement(selectedEl.id, { x: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs">Y</label>
                    <Input
                      type="number"
                      value={Math.round(selectedEl.y)}
                      onChange={(e) => updateElement(selectedEl.id, { y: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Sticker Properties */}
              {selectedEl.type === 'sticker' && (
                <div className="space-y-3">
                  {selectedEl.stickerType === 'poll' && (
                    <>
                      <div>
                        <label className="text-white/50 text-xs">Question</label>
                        <Input
                          value={selectedEl.data.question}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, question: e.target.value }
                          })}
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">Option 1</label>
                        <Input
                          value={selectedEl.data.options[0]}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, options: [e.target.value, selectedEl.data.options[1]] }
                          })}
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">Option 2</label>
                        <Input
                          value={selectedEl.data.options[1]}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, options: [selectedEl.data.options[0], e.target.value] }
                          })}
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedEl.stickerType === 'question' && (
                    <div>
                      <label className="text-white/50 text-xs">Question</label>
                      <Input
                        value={selectedEl.data.question}
                        onChange={(e) => updateElement(selectedEl.id, { 
                          data: { ...selectedEl.data, question: e.target.value }
                        })}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  )}
                  
                  {selectedEl.stickerType === 'countdown' && (
                    <>
                      <div>
                        <label className="text-white/50 text-xs">Titre</label>
                        <Input
                          value={selectedEl.data.title}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, title: e.target.value }
                          })}
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">Date de fin</label>
                        <Input
                          type="datetime-local"
                          value={selectedEl.data.endDate}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, endDate: e.target.value }
                          })}
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedEl.stickerType === 'mention' && (
                    <div>
                      <label className="text-white/50 text-xs">@Username</label>
                      <Input
                        value={selectedEl.data.username}
                        onChange={(e) => updateElement(selectedEl.id, { 
                          data: { ...selectedEl.data, username: e.target.value }
                        })}
                        placeholder="username"
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  )}
                  
                  {selectedEl.stickerType === 'hashtag' && (
                    <div>
                      <label className="text-white/50 text-xs">#Hashtag</label>
                      <Input
                        value={selectedEl.data.tag}
                        onChange={(e) => updateElement(selectedEl.id, { 
                          data: { ...selectedEl.data, tag: e.target.value }
                        })}
                        placeholder="hashtag"
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  )}
                  
                  {selectedEl.stickerType === 'location' && (
                    <div>
                      <label className="text-white/50 text-xs">Lieu</label>
                      <Input
                        value={selectedEl.data.place}
                        onChange={(e) => updateElement(selectedEl.id, { 
                          data: { ...selectedEl.data, place: e.target.value }
                        })}
                        placeholder="Paris, France"
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  )}
                  
                  {selectedEl.stickerType === 'link' && (
                    <>
                      <div>
                        <label className="text-white/50 text-xs">URL</label>
                        <Input
                          value={selectedEl.data.url}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, url: e.target.value }
                          })}
                          placeholder="https://..."
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">Label</label>
                        <Input
                          value={selectedEl.data.label}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, label: e.target.value }
                          })}
                          placeholder="En savoir plus"
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedEl.stickerType === 'emoji_slider' && (
                    <>
                      <div>
                        <label className="text-white/50 text-xs">Question</label>
                        <Input
                          value={selectedEl.data.question}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, question: e.target.value }
                          })}
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">Emoji</label>
                        <Input
                          value={selectedEl.data.emoji}
                          onChange={(e) => updateElement(selectedEl.id, { 
                            data: { ...selectedEl.data, emoji: e.target.value }
                          })}
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Text Properties */}
              {selectedEl.type === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-white/50 text-xs">Texte</label>
                    <Input
                      value={selectedEl.text}
                      onChange={(e) => updateElement(selectedEl.id, { text: e.target.value })}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs">Taille</label>
                    <Input
                      type="number"
                      value={selectedEl.fontSize}
                      onChange={(e) => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-2 block">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                      {STICKER_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => updateElement(selectedEl.id, { color })}
                          className={`w-6 h-6 rounded-full border-2 ${
                            selectedEl.color === color ? 'border-pink-500' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Delete Button */}
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => deleteElement(selectedEl.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Move className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">Sélectionnez un élément</p>
              <p className="text-white/30 text-xs mt-1">pour modifier ses propriétés</p>
            </div>
          )}
          
          {/* Elements List */}
          <div className="mt-6">
            <h4 className="text-white/70 text-sm font-medium mb-3">Éléments ({elements.length})</h4>
            <div className="space-y-2">
              {elements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElement(el.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedElement === el.id ? 'bg-pink-500/20' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-white/30" />
                  {el.type === 'sticker' ? (
                    <span className="text-white text-sm">{el.name}</span>
                  ) : (
                    <span className="text-white text-sm truncate">{el.text}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50 p-4">
          <div className="bg-slate-50 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Instagram className="w-6 h-6 text-pink-500" />
              Ajouter un compte Instagram
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm block mb-1">Nom d'utilisateur</label>
                <Input
                  placeholder="votre_username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm block mb-1">Mot de passe</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-300 text-xs">
                  🔐 Vos identifiants sont chiffrés. ⚠️ L'automatisation est contre les CGU Instagram.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowAddAccount(false); setShowPassword(false); }}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-pink-600 hover:bg-pink-500"
                  onClick={addAccount}
                  disabled={savingAccount}
                >
                  {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramStoryEditor;
