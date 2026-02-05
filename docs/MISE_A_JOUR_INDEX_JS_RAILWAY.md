# Mise à jour du index.js pour Railway - Support des médias

## Modifications à apporter au fichier `index.js` dans le repo GitHub `whatsapp-moltbot`

Le fichier doit être mis à jour pour gérer l'envoi des images, documents et fichiers audio vers le backend CRM.

### Code complet à remplacer/ajouter dans votre `index.js`:

```javascript
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'https://crmalphaagency-f7ab9328.svc-us5.zcloud.ws/api/whatsapp/webhook';

let sock = null;
let qrCode = null;
let connectionStatus = 'disconnected';
let connectedPhone = null;
let connectedName = null;

const logger = pino({ level: 'warn' });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: logger,
        browser: ['MoltBot CRM', 'Chrome', '120.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCode = qr;
            connectionStatus = 'waiting_qr';
            console.log('📱 QR Code généré - Scannez avec WhatsApp');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log('❌ Connexion fermée. Raison:', lastDisconnect?.error?.message);
            connectionStatus = 'disconnected';
            qrCode = null;
            connectedPhone = null;
            connectedName = null;

            if (shouldReconnect) {
                console.log('🔄 Tentative de reconnexion dans 5 secondes...');
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('🚪 Déconnecté manuellement - pas de reconnexion automatique');
            }
        } else if (connection === 'open') {
            console.log('✅ Connecté à WhatsApp !');
            connectionStatus = 'connected';
            qrCode = null;
            
            try {
                const user = sock.user;
                if (user) {
                    connectedPhone = user.id.split(':')[0].replace('@s.whatsapp.net', '');
                    connectedName = user.name || 'WhatsApp User';
                    console.log(`📞 Connecté en tant que: ${connectedName} (${connectedPhone})`);
                }
            } catch (e) {
                console.log('Info utilisateur non disponible');
            }
        }
    });

    // Gestion des messages entrants avec support média
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (msg.key.fromMe) continue;
            
            const from = msg.key.remoteJid;
            const phoneNumber = from.replace('@s.whatsapp.net', '').replace('@lid', '@lid');
            
            console.log(`📩 Message de ${phoneNumber}`);
            
            try {
                let messageType = 'text';
                let textContent = '';
                let mediaBase64 = null;
                let mediaType = null;
                let fileName = null;
                
                const msgContent = msg.message;
                
                // Message texte simple
                if (msgContent?.conversation) {
                    messageType = 'text';
                    textContent = msgContent.conversation;
                } 
                // Message texte étendu
                else if (msgContent?.extendedTextMessage?.text) {
                    messageType = 'text';
                    textContent = msgContent.extendedTextMessage.text;
                }
                // Message image
                else if (msgContent?.imageMessage) {
                    messageType = 'image';
                    textContent = msgContent.imageMessage.caption || '';
                    mediaType = msgContent.imageMessage.mimetype || 'image/jpeg';
                    
                    try {
                        console.log('📷 Téléchargement de l\'image...');
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                            logger,
                            reuploadRequest: sock.updateMediaMessage
                        });
                        mediaBase64 = buffer.toString('base64');
                        console.log(`✅ Image téléchargée: ${mediaBase64.length} caractères base64`);
                    } catch (dlErr) {
                        console.error('❌ Erreur téléchargement image:', dlErr.message);
                    }
                }
                // Message audio/vocal
                else if (msgContent?.audioMessage) {
                    messageType = 'audio';
                    mediaType = msgContent.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                    
                    try {
                        console.log('🎤 Téléchargement de l\'audio...');
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                            logger,
                            reuploadRequest: sock.updateMediaMessage
                        });
                        mediaBase64 = buffer.toString('base64');
                        console.log(`✅ Audio téléchargé: ${mediaBase64.length} caractères base64`);
                    } catch (dlErr) {
                        console.error('❌ Erreur téléchargement audio:', dlErr.message);
                    }
                }
                // Message document
                else if (msgContent?.documentMessage) {
                    messageType = 'document';
                    textContent = msgContent.documentMessage.caption || '';
                    mediaType = msgContent.documentMessage.mimetype || 'application/octet-stream';
                    fileName = msgContent.documentMessage.fileName || 'document';
                    
                    try {
                        console.log(`📄 Téléchargement du document: ${fileName}`);
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                            logger,
                            reuploadRequest: sock.updateMediaMessage
                        });
                        mediaBase64 = buffer.toString('base64');
                        console.log(`✅ Document téléchargé: ${mediaBase64.length} caractères base64`);
                    } catch (dlErr) {
                        console.error('❌ Erreur téléchargement document:', dlErr.message);
                    }
                }
                // Message vidéo
                else if (msgContent?.videoMessage) {
                    messageType = 'video';
                    textContent = msgContent.videoMessage.caption || '';
                    mediaType = msgContent.videoMessage.mimetype || 'video/mp4';
                    
                    try {
                        console.log('🎬 Téléchargement de la vidéo...');
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                            logger,
                            reuploadRequest: sock.updateMediaMessage
                        });
                        mediaBase64 = buffer.toString('base64');
                        console.log(`✅ Vidéo téléchargée: ${mediaBase64.length} caractères base64`);
                    } catch (dlErr) {
                        console.error('❌ Erreur téléchargement vidéo:', dlErr.message);
                    }
                }
                // Sticker
                else if (msgContent?.stickerMessage) {
                    messageType = 'sticker';
                    textContent = '[Sticker reçu]';
                }
                // Autre type
                else {
                    console.log('Type de message non reconnu:', Object.keys(msgContent || {}));
                    continue;
                }
                
                console.log(`📤 Envoi au webhook: type=${messageType}, text=${textContent.substring(0, 50)}, hasMedia=${!!mediaBase64}`);
                
                // Envoyer au backend
                const webhookPayload = {
                    phone_number: phoneNumber,
                    message: textContent,
                    message_type: messageType,
                    message_id: msg.key.id,
                    timestamp: msg.messageTimestamp,
                    media_base64: mediaBase64,
                    media_type: mediaType,
                    file_name: fileName
                };
                
                const response = await axios.post(BACKEND_WEBHOOK_URL, webhookPayload, {
                    timeout: 60000,  // 60 secondes pour laisser le temps à l'IA
                    headers: { 'Content-Type': 'application/json' }
                });
                
                // Envoyer la réponse du bot
                if (response.data?.reply) {
                    await sock.sendMessage(from, { text: response.data.reply });
                    console.log(`✅ Réponse envoyée à ${phoneNumber}`);
                }
                
            } catch (error) {
                console.error('❌ Erreur traitement message:', error.message);
                if (error.response) {
                    console.error('Réponse erreur:', error.response.status, error.response.data);
                }
            }
        }
    });
}

// Endpoints API
app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus === 'connected',
        status: connectionStatus,
        phone_number: connectedPhone,
        name: connectedName
    });
});

app.get('/qr', (req, res) => {
    if (connectionStatus === 'connected') {
        res.json({ qr: null, message: 'Déjà connecté', connected: true });
    } else if (qrCode) {
        res.json({ qr: qrCode, connected: false });
    } else {
        res.json({ qr: null, message: 'QR code non disponible, reconnexion en cours...', connected: false });
    }
});

app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            connectionStatus = 'disconnected';
            qrCode = null;
            connectedPhone = null;
            connectedName = null;
        }
        res.json({ success: true, message: 'Déconnecté' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/send', async (req, res) => {
    const { phone_number, message } = req.body;
    
    if (!sock || connectionStatus !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp non connecté' });
    }
    
    try {
        const jid = phone_number.includes('@') ? phone_number : `${phone_number.replace('+', '')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pour envoyer une image
app.post('/send-image', async (req, res) => {
    const { phone_number, image_url, caption } = req.body;
    
    if (!sock || connectionStatus !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp non connecté' });
    }
    
    try {
        const jid = phone_number.includes('@') ? phone_number : `${phone_number.replace('+', '')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { 
            image: { url: image_url }, 
            caption: caption || '' 
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur envoi image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pour envoyer un document
app.post('/send-document', async (req, res) => {
    const { phone_number, document_url, filename, caption } = req.body;
    
    if (!sock || connectionStatus !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp non connecté' });
    }
    
    try {
        const jid = phone_number.includes('@') ? phone_number : `${phone_number.replace('+', '')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { 
            document: { url: document_url }, 
            fileName: filename || 'document',
            caption: caption || ''
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur envoi document:', error);
        res.status(500).json({ error: error.message });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur WhatsApp démarré sur le port ${PORT}`);
    connectToWhatsApp();
});
```

---

## Variables d'environnement Railway

**⚠️ IMPORTANT**: Vous devez utiliser votre URL de production, pas l'URL de preview!

```
BACKEND_WEBHOOK_URL=https://alphagency.fr/api/whatsapp/webhook
```

Si vous utilisez l'URL preview d'Emergent (comme `crmalphaagency-xxxxx.svc-usX.zcloud.ws`), MoltBot ne fonctionnera pas en production car ce certificat n'est pas valide depuis Railway.

---

## Résumé des changements

1. **Import `downloadMediaMessage`** - Permet de télécharger les médias WhatsApp
2. **Gestion images** - Télécharge et encode en base64
3. **Gestion audio/vocaux** - Télécharge et encode en base64
4. **Gestion documents** - Télécharge avec nom de fichier
5. **Gestion vidéos** - Télécharge et encode en base64
6. **Nouveaux endpoints** - `/send-image` et `/send-document` pour envoyer des médias

---

## Après la mise à jour

1. Committez les changements sur GitHub
2. Railway redéploiera automatiquement
3. Reconnectez WhatsApp si nécessaire (nouveau QR code)
4. Testez en envoyant une image au bot

Le bot pourra alors:
- Analyser les images que vous envoyez
- Générer des images basées sur vos demandes
- Recevoir et analyser des documents PDF, etc.
