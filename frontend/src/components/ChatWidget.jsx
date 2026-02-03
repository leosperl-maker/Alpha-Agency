import { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, X, Send, Bot, Loader2, 
  Sparkles, Phone, Mail, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.REACT_APP_BACKEND_URL;

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [faq, setFaq] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadFaq();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadFaq = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/public/faq`);
      if (res.ok) {
        const data = await res.json();
        setFaq(data.faq || []);
      }
    } catch (error) {
      console.error("Error loading FAQ:", error);
    }
  };

  const openChat = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        type: "bot",
        text: "Bonjour ! 👋 Je suis Agent X, l'assistant d'Alpha Agency. Comment puis-je vous aider ?",
        time: new Date()
      }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      type: "user",
      text: input,
      time: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const userQuestion = input.toLowerCase();
    let botResponse = null;

    // Check FAQ for matching answer
    for (const item of faq) {
      const questionWords = item.question.toLowerCase().split(" ");
      const matchCount = questionWords.filter(word => 
        userQuestion.includes(word) && word.length > 3
      ).length;

      if (matchCount >= 2 || userQuestion.includes(item.question.toLowerCase().substring(0, 20))) {
        botResponse = item.answer;
        break;
      }
    }

    // Keyword-based responses
    if (!botResponse) {
      if (userQuestion.includes("tarif") || userQuestion.includes("prix") || userQuestion.includes("coût") || userQuestion.includes("combien")) {
        botResponse = "Nos tarifs sont personnalisés selon votre projet. Pour un site vitrine, comptez à partir de 990€. Pour un devis précis, laissez-moi vos coordonnées et nous vous recontacterons rapidement !";
        setTimeout(() => setShowContactForm(true), 500);
      } else if (userQuestion.includes("délai") || userQuestion.includes("temps") || userQuestion.includes("combien de temps")) {
        botResponse = "Un site vitrine est généralement livré en 7 jours ouvrés. Les projets plus complexes peuvent prendre 2 à 4 semaines. Souhaitez-vous qu'on en discute ?";
      } else if (userQuestion.includes("contact") || userQuestion.includes("appeler") || userQuestion.includes("téléphone") || userQuestion.includes("email")) {
        botResponse = "Vous pouvez nous joindre au 0690 05 34 44 ou par email à contact@alphagency.fr. Préférez-vous qu'on vous rappelle ?";
        setTimeout(() => setShowContactForm(true), 500);
      } else if (userQuestion.includes("service") || userQuestion.includes("proposez") || userQuestion.includes("faites")) {
        botResponse = "Nous proposons :\n• Création de sites web (vitrine, e-commerce)\n• Community management\n• Photographie professionnelle\n• Publicité digitale (Google Ads, Meta Ads)\n\nQuel service vous intéresse ?";
      } else if (userQuestion.includes("devis") || userQuestion.includes("projet")) {
        botResponse = "Super ! Pour établir un devis personnalisé, j'aurais besoin de quelques informations. Pouvez-vous me décrire votre projet ?";
        setTimeout(() => setShowContactForm(true), 1000);
      } else if (userQuestion.includes("humain") || userQuestion.includes("personne") || userQuestion.includes("conseiller") || userQuestion.includes("quelqu'un")) {
        botResponse = "Bien sûr ! Laissez-moi vos coordonnées et un membre de notre équipe vous contactera dans les plus brefs délais.";
        setTimeout(() => setShowContactForm(true), 300);
      } else if (userQuestion.includes("bonjour") || userQuestion.includes("salut") || userQuestion.includes("hello")) {
        botResponse = "Bonjour ! Ravi de vous accueillir. Que puis-je faire pour vous aujourd'hui ? 😊";
      } else if (userQuestion.includes("merci")) {
        botResponse = "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne journée ! 🙏";
      } else {
        botResponse = "Je ne suis pas sûr de comprendre votre question. Voici ce que je peux vous aider avec :\n\n• Nos services et tarifs\n• Les délais de livraison\n• Comment nous contacter\n• Obtenir un devis\n\nOu si vous préférez, je peux vous mettre en relation avec un conseiller.";
      }
    }

    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: "bot",
        text: botResponse,
        time: new Date()
      }]);
      setLoading(false);
    }, 800);
  };

  const submitContactForm = async () => {
    if (!contactForm.name || !contactForm.email) return;

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/moltbot/public/inquiry?name=${encodeURIComponent(contactForm.name)}&email=${encodeURIComponent(contactForm.email)}&message=${encodeURIComponent(contactForm.message || "Demande via Agent X")}&phone=${encodeURIComponent(contactForm.phone || "")}`, {
        method: "POST"
      });

      if (res.ok) {
        setMessages(prev => [...prev, {
          type: "bot",
          text: "✅ Merci ! Vos informations ont été enregistrées. Un membre de notre équipe vous contactera très rapidement. À bientôt ! 👋",
          time: new Date()
        }]);
        setShowContactForm(false);
        setContactForm({ name: "", email: "", phone: "", message: "" });
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: "bot",
        text: "Désolé, une erreur s'est produite. Vous pouvez nous contacter directement au 0690 05 34 44.",
        time: new Date()
      }]);
    }

    setLoading(false);
  };

  const quickQuestions = [
    "Quels sont vos services ?",
    "Quels sont vos tarifs ?",
    "Je veux un devis",
    "Parler à quelqu'un"
  ];

  return (
    <>
      {/* Chat Button - Red/Black theme */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={openChat}
            data-testid="chat-widget-button"
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#CE0202] hover:bg-[#B00202] rounded-full shadow-lg hover:shadow-xl flex items-center justify-center group transition-all hover:scale-110"
          >
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-[#CE0202] flex items-center justify-center">
              <span className="w-2 h-2 bg-[#CE0202] rounded-full animate-pulse" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window - Red/White/Black theme */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            data-testid="chat-widget-window"
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          >
            {/* Header - Red gradient */}
            <div className="bg-gradient-to-r from-[#CE0202] to-[#8B0000] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Agent X</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-white/80 text-xs">En ligne</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%]`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl ${
                        msg.type === "user"
                          ? "bg-[#CE0202] text-white rounded-br-md"
                          : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{msg.text}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${msg.type === "user" ? "text-right" : "text-left"}`}>
                      {msg.time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#CE0202] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-[#CE0202] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-[#CE0202] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Form */}
              {showContactForm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#CE0202]" />
                    Laissez-nous vos coordonnées
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Votre nom *"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#CE0202] focus:ring-1 focus:ring-[#CE0202]"
                    />
                    <input
                      type="email"
                      placeholder="Votre email *"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#CE0202] focus:ring-1 focus:ring-[#CE0202]"
                    />
                    <input
                      type="tel"
                      placeholder="Votre téléphone"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#CE0202] focus:ring-1 focus:ring-[#CE0202]"
                    />
                    <textarea
                      placeholder="Votre message (optionnel)"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#CE0202] focus:ring-1 focus:ring-[#CE0202] resize-none"
                    />
                    <button
                      onClick={submitContactForm}
                      disabled={loading || !contactForm.name || !contactForm.email}
                      className="w-full py-2 bg-[#CE0202] hover:bg-[#B00202] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                    >
                      {loading ? "Envoi..." : "Envoyer"}
                    </button>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-white">
                <p className="text-xs text-gray-500 mb-2">Questions fréquentes :</p>
                <div className="flex flex-wrap gap-1">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      className="px-3 py-1 bg-gray-100 hover:bg-[#CE0202]/10 text-gray-700 hover:text-[#CE0202] rounded-full text-xs transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-gray-100 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#CE0202]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 bg-[#CE0202] hover:bg-[#B00202] rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:shadow-md transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center">
                Propulsé par Alpha Agency • 🇬🇵 Guadeloupe
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
