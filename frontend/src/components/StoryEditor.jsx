import { useState, useRef, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Instagram, Image, Video, Type, BarChart2, HelpCircle, MessageCircle,
  Clock, Sparkles, Link, AtSign, Trash2, Move, Bold, Italic, AlignLeft,
  AlignCenter, Palette, Plus, ChevronDown, X, Upload
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";

// Draggable sticker component
const DraggableSticker = ({ id, type, children, position, onRemove, isSelected, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type, position }
  });

  const style = {
    position: "absolute",
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: transform 
      ? `translate(${transform.x}px, ${transform.y}px) translate(-50%, -50%)` 
      : "translate(-50%, -50%)",
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : isSelected ? 100 : 10,
    cursor: "move",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      className={`group ${isSelected ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-transparent" : ""}`}
    >
      {children}
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(id); }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
};

// Sticker templates
const StickerPoll = ({ data, onChange, isEditing }) => (
  <div className="bg-white/95 rounded-2xl p-3 min-w-[200px] shadow-xl backdrop-blur-sm">
    {isEditing ? (
      <input
        value={data.question}
        onChange={(e) => onChange({ ...data, question: e.target.value })}
        placeholder="Posez votre question..."
        className="w-full text-sm font-semibold text-gray-800 bg-transparent border-b border-gray-300 pb-1 mb-2 outline-none"
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <p className="text-sm font-semibold text-gray-800 mb-2">{data.question || "Question ?"}</p>
    )}
    <div className="flex gap-2">
      {isEditing ? (
        <>
          <input
            value={data.options[0]}
            onChange={(e) => onChange({ ...data, options: [e.target.value, data.options[1]] })}
            placeholder="Option A"
            className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full text-center outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <input
            value={data.options[1]}
            onChange={(e) => onChange({ ...data, options: [data.options[0], e.target.value] })}
            placeholder="Option B"
            className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-center outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        </>
      ) : (
        <>
          <span className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full text-center">
            {data.options[0] || "Oui"}
          </span>
          <span className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-center">
            {data.options[1] || "Non"}
          </span>
        </>
      )}
    </div>
  </div>
);

const StickerQuestion = ({ data, onChange, isEditing }) => (
  <div className="bg-white/95 rounded-2xl p-3 min-w-[180px] shadow-xl backdrop-blur-sm">
    <div className="flex items-center gap-2 mb-2">
      <MessageCircle className="w-4 h-4 text-purple-500" />
      <span className="text-xs text-gray-500 font-medium">Question</span>
    </div>
    {isEditing ? (
      <input
        value={data.question}
        onChange={(e) => onChange({ ...data, question: e.target.value })}
        placeholder="Posez-moi une question..."
        className="w-full text-sm text-gray-800 bg-gray-100 rounded-lg px-3 py-2 outline-none"
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600">
        {data.question || "Posez-moi une question..."}
      </div>
    )}
  </div>
);

const StickerQuiz = ({ data, onChange, isEditing }) => (
  <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl p-3 min-w-[200px] shadow-xl">
    <div className="flex items-center gap-2 mb-2">
      <Sparkles className="w-4 h-4 text-white" />
      <span className="text-xs text-white/80 font-medium">QUIZ</span>
    </div>
    {isEditing ? (
      <>
        <input
          value={data.question}
          onChange={(e) => onChange({ ...data, question: e.target.value })}
          placeholder="Question du quiz..."
          className="w-full text-sm font-semibold text-white bg-white/20 rounded-lg px-2 py-1 mb-2 outline-none placeholder-white/60"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="space-y-1">
          {data.options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={(e) => {
                const newOpts = [...data.options];
                newOpts[i] = e.target.value;
                onChange({ ...data, options: newOpts });
              }}
              placeholder={`Option ${i + 1}`}
              className={`w-full px-3 py-1.5 text-xs rounded-lg text-center outline-none ${
                i === data.correctIndex 
                  ? "bg-green-500 text-white" 
                  : "bg-white/90 text-gray-800"
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          ))}
        </div>
      </>
    ) : (
      <>
        <p className="text-sm font-semibold text-white mb-2">{data.question || "Question ?"}</p>
        <div className="space-y-1">
          {data.options.map((opt, i) => (
            <div
              key={i}
              className={`px-3 py-1.5 text-xs rounded-lg text-center ${
                i === data.correctIndex 
                  ? "bg-green-500 text-white" 
                  : "bg-white/90 text-gray-800"
              }`}
            >
              {opt || `Option ${i + 1}`}
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

const StickerMention = ({ data, onChange, isEditing }) => (
  <div className="bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-xl">
    {isEditing ? (
      <div className="flex items-center">
        <AtSign className="w-4 h-4 text-white mr-1" />
        <input
          value={data.username}
          onChange={(e) => onChange({ ...data, username: e.target.value })}
          placeholder="username"
          className="text-white text-sm font-semibold bg-transparent outline-none w-24"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    ) : (
      <span className="text-white text-sm font-semibold">@{data.username || "username"}</span>
    )}
  </div>
);

const StickerLink = ({ data, onChange, isEditing }) => (
  <div className="bg-white/95 rounded-full px-4 py-2 shadow-xl flex items-center gap-2 backdrop-blur-sm">
    <Link className="w-4 h-4 text-blue-500" />
    {isEditing ? (
      <input
        value={data.text}
        onChange={(e) => onChange({ ...data, text: e.target.value })}
        placeholder="En savoir plus"
        className="text-sm font-medium text-blue-600 bg-transparent outline-none"
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <span className="text-sm font-medium text-blue-600">{data.text || "En savoir plus"}</span>
    )}
  </div>
);

const StickerText = ({ data, onChange, isEditing }) => {
  const fontSizes = { small: "text-sm", medium: "text-lg", large: "text-2xl", xlarge: "text-4xl" };
  const fontFamilies = {
    modern: "font-sans",
    classic: "font-serif",
    typewriter: "font-mono",
    bold: "font-black",
  };

  return (
    <div
      className={`px-4 py-2 ${fontFamilies[data.fontFamily || "modern"]} ${fontSizes[data.fontSize || "medium"]}`}
      style={{
        color: data.color || "#FFFFFF",
        textShadow: data.shadow ? "2px 2px 4px rgba(0,0,0,0.5)" : "none",
        fontWeight: data.bold ? "bold" : "normal",
        fontStyle: data.italic ? "italic" : "normal",
        textAlign: data.align || "center",
        backgroundColor: data.bgColor || "transparent",
        borderRadius: data.bgColor ? "8px" : "0",
      }}
    >
      {isEditing ? (
        <textarea
          value={data.text}
          onChange={(e) => onChange({ ...data, text: e.target.value })}
          placeholder="Votre texte..."
          className="bg-transparent outline-none resize-none text-center w-full min-w-[150px]"
          style={{ color: "inherit" }}
          onClick={(e) => e.stopPropagation()}
          rows={2}
        />
      ) : (
        <span className="whitespace-pre-wrap">{data.text || "Texte"}</span>
      )}
    </div>
  );
};

// Main Story Editor Component
const StoryEditor = ({ 
  onSave, 
  onPublish, 
  initialMedia = null,
  accounts = [],
  selectedAccountId = null,
  onAccountChange = () => {},
  isPublishing = false
}) => {
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(initialMedia);
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [stickers, setStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [activeTab, setActiveTab] = useState("stickers");
  const [textSettings, setTextSettings] = useState({
    color: "#FFFFFF",
    fontSize: "medium",
    fontFamily: "modern",
    bold: false,
    italic: false,
    shadow: true,
    bgColor: "",
    align: "center"
  });
  
  const phoneRef = useRef(null);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event;
    if (!active || !phoneRef.current) return;

    const phoneRect = phoneRef.current.getBoundingClientRect();
    
    setStickers(prev => prev.map(s => {
      if (s.id === active.id) {
        const deltaXPercent = (delta.x / phoneRect.width) * 100;
        const deltaYPercent = (delta.y / phoneRect.height) * 100;
        return {
          ...s,
          position: {
            x: Math.max(5, Math.min(95, s.position.x + deltaXPercent)),
            y: Math.max(5, Math.min(95, s.position.y + deltaYPercent))
          }
        };
      }
      return s;
    }));
  }, []);

  const addSticker = (type) => {
    const defaults = {
      poll: { question: "", options: ["Oui", "Non"] },
      question: { question: "" },
      quiz: { question: "", options: ["", "", "", ""], correctIndex: 0 },
      mention: { username: "" },
      link: { url: "", text: "En savoir plus" },
      text: { text: "", ...textSettings }
    };

    const newSticker = {
      id: `sticker-${Date.now()}`,
      type,
      data: defaults[type],
      position: { x: 50, y: 50 }
    };

    setStickers(prev => [...prev, newSticker]);
    setSelectedSticker(newSticker.id);
  };

  const updateSticker = (id, newData) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, data: newData } : s));
  };

  const removeSticker = (id) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    if (selectedSticker === id) setSelectedSticker(null);
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const renderSticker = (sticker) => {
    const isEditing = selectedSticker === sticker.id;
    const props = {
      data: sticker.data,
      onChange: (newData) => updateSticker(sticker.id, newData),
      isEditing
    };

    switch (sticker.type) {
      case "poll": return <StickerPoll {...props} />;
      case "question": return <StickerQuestion {...props} />;
      case "quiz": return <StickerQuiz {...props} />;
      case "mention": return <StickerMention {...props} />;
      case "link": return <StickerLink {...props} />;
      case "text": return <StickerText {...props} />;
      default: return null;
    }
  };

  const handleSave = () => {
    onSave?.({
      mediaFile,
      mediaPreview,
      backgroundColor,
      stickers,
      textSettings
    });
  };

  const handlePublish = () => {
    onPublish?.({
      mediaFile,
      mediaPreview,
      backgroundColor,
      stickers,
      textSettings
    });
  };

  const stickerOptions = [
    { type: "poll", icon: BarChart2, label: "Sondage", color: "from-pink-500 to-purple-500" },
    { type: "question", icon: MessageCircle, label: "Question", color: "from-purple-500 to-indigo-500" },
    { type: "quiz", icon: Sparkles, label: "Quiz", color: "from-orange-500 to-pink-500" },
    { type: "mention", icon: AtSign, label: "Mention", color: "from-gray-700 to-gray-900" },
    { type: "link", icon: Link, label: "Lien", color: "from-blue-500 to-cyan-500" },
    { type: "text", icon: Type, label: "Texte", color: "from-green-500 to-teal-500" },
  ];

  const colors = ["#FFFFFF", "#000000", "#FF3B5C", "#FF6B35", "#FFD23F", "#3DDC84", "#00B4D8", "#7B2CBF"];
  const bgColors = ["#000000", "#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560", "#2d4059", "#222831"];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Phone Preview */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <p className="text-white/60 text-sm mb-3">Aperçu en direct</p>
        
        {/* Phone Frame */}
        <div className="relative">
          {/* Phone bezel */}
          <div className="absolute -inset-3 rounded-[50px] bg-gray-800 shadow-2xl" />
          
          {/* Dynamic Island */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-50" />
          
          {/* Screen */}
          <div
            ref={phoneRef}
            className="relative w-[280px] h-[560px] rounded-[40px] overflow-hidden"
            style={{ backgroundColor }}
            onClick={() => setSelectedSticker(null)}
          >
            {/* Media Background */}
            {mediaPreview && (
              <img
                src={mediaPreview}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Upload Prompt */}
            {!mediaPreview && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-white/30 mb-3" />
                <p className="text-white/50 text-sm">Cliquez pour ajouter</p>
                <p className="text-white/30 text-xs">une image ou vidéo</p>
              </div>
            )}

            {/* Stickers Layer */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {stickers.map(sticker => (
                <DraggableSticker
                  key={sticker.id}
                  id={sticker.id}
                  type={sticker.type}
                  position={sticker.position}
                  isSelected={selectedSticker === sticker.id}
                  onSelect={setSelectedSticker}
                  onRemove={removeSticker}
                >
                  {renderSticker(sticker)}
                </DraggableSticker>
              ))}
            </DndContext>

            {/* Instagram UI Overlay */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-30 pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500" />
                <span className="text-white text-sm font-medium drop-shadow">Votre story</span>
              </div>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          className="hidden"
        />
        
        {mediaPreview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-white/60 hover:text-white"
          >
            <Image className="w-4 h-4 mr-2" />
            Changer le média
          </Button>
        )}
      </div>

      {/* Editor Panel */}
      <div className="flex-1 bg-white/5 rounded-xl p-4 overflow-y-auto max-h-[600px]">
        {/* Account Selection */}
        {accounts.length > 0 && (
          <div className="mb-4">
            <label className="text-white/70 text-sm block mb-2">Compte Instagram</label>
            <select
              value={selectedAccountId || ""}
              onChange={(e) => onAccountChange(e.target.value)}
              className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-gray-900">@{acc.username}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
          {[
            { id: "stickers", label: "Stickers", icon: Sparkles },
            { id: "text", label: "Texte", icon: Type },
            { id: "background", label: "Fond", icon: Palette }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id 
                  ? "bg-pink-500/20 text-pink-400" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stickers Tab */}
        {activeTab === "stickers" && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm">Cliquez pour ajouter un sticker</p>
            <div className="grid grid-cols-2 gap-3">
              {stickerOptions.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => addSticker(opt.type)}
                  data-testid={`sticker-btn-${opt.type}`}
                  className={`p-4 rounded-xl bg-gradient-to-br ${opt.color} hover:opacity-90 transition-opacity flex flex-col items-center gap-2`}
                >
                  <opt.icon className="w-6 h-6 text-white" />
                  <span className="text-white text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>

            {stickers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/60 text-sm mb-2">Stickers ajoutés ({stickers.length})</p>
                <div className="space-y-2">
                  {stickers.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => setSelectedSticker(s.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                        selectedSticker === s.id ? "bg-pink-500/20" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-white text-sm capitalize">{s.type}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSticker(s.id); }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm mb-2">Style du texte par défaut</p>
            
            {/* Font Size */}
            <div>
              <label className="text-white/70 text-xs block mb-2">Taille</label>
              <div className="flex gap-2">
                {["small", "medium", "large", "xlarge"].map(size => (
                  <button
                    key={size}
                    onClick={() => setTextSettings(p => ({ ...p, fontSize: size }))}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      textSettings.fontSize === size 
                        ? "bg-pink-500 text-white" 
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {size === "small" ? "S" : size === "medium" ? "M" : size === "large" ? "L" : "XL"}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="text-white/70 text-xs block mb-2">Police</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "modern", label: "Moderne" },
                  { id: "classic", label: "Classique" },
                  { id: "typewriter", label: "Machine" },
                  { id: "bold", label: "Gras" }
                ].map(font => (
                  <button
                    key={font.id}
                    onClick={() => setTextSettings(p => ({ ...p, fontFamily: font.id }))}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      textSettings.fontFamily === font.id 
                        ? "bg-pink-500 text-white" 
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-white/70 text-xs block mb-2">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setTextSettings(p => ({ ...p, color }))}
                    className={`w-8 h-8 rounded-full border-2 ${
                      textSettings.color === color ? "border-pink-500" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Style Options */}
            <div className="flex gap-2">
              <button
                onClick={() => setTextSettings(p => ({ ...p, bold: !p.bold }))}
                className={`p-2 rounded-lg ${textSettings.bold ? "bg-pink-500" : "bg-white/10"}`}
              >
                <Bold className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setTextSettings(p => ({ ...p, italic: !p.italic }))}
                className={`p-2 rounded-lg ${textSettings.italic ? "bg-pink-500" : "bg-white/10"}`}
              >
                <Italic className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setTextSettings(p => ({ ...p, shadow: !p.shadow }))}
                className={`p-2 rounded-lg ${textSettings.shadow ? "bg-pink-500" : "bg-white/10"}`}
                title="Ombre"
              >
                <span className="text-white text-sm font-bold">S</span>
              </button>
            </div>

            <Button
              onClick={() => addSticker("text")}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un texte
            </Button>
          </div>
        )}

        {/* Background Tab */}
        {activeTab === "background" && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm">Couleur de fond (si pas d'image)</p>
            <div className="flex gap-2 flex-wrap">
              {bgColors.map(color => (
                <button
                  key={color}
                  onClick={() => setBackgroundColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 ${
                    backgroundColor === color ? "border-pink-500" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            <div>
              <label className="text-white/70 text-xs block mb-2">Couleur personnalisée</label>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex gap-3">
          <Button
            variant="outline"
            onClick={handleSave}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Sauvegarder
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !selectedAccountId}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            {isPublishing ? "Publication..." : "Publier"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoryEditor;
