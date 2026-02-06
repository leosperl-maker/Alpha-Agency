# Mise à jour du index.js pour Railway - Version Complète

## ⚠️ IMPORTANT: Mise à jour critique pour audio et fichiers

Ce document contient le code **COMPLET** à déployer sur Railway pour corriger:
1. ✅ Transcription audio (format correct + timeout étendu)
2. ✅ Compression d'images avec `sharp` (évite timeouts)
3. ✅ Envoi de fichiers en tant que FICHIERS (pas de liens URL)
4. ✅ Retry automatique en cas d'échec
5. ✅ Anti-répétition de messages

---

## package.json COMPLET

```json
{
  "name": "whatsapp-moltbot",
  "version": "2.0.0",
  "description": "WhatsApp MoltBot Service",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.9",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0",
    "pino": "^8.16.0",
    "sharp": "^0.32.6",
    "qrcode": "^1.5.3"
  }
}
```

---

## index.js COMPLET

```javascript
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const pino = require('pino');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;
const BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'https://alphagency.fr/api/whatsapp/webhook';

let sock = null;
let qrCode = null;
let connectionStatus = 'disconnected';
let connectedPhone = null;
let connectedName = null;

// Anti-répétition: stocke les IDs de messages traités
const processedMessages = new Set();
const MESSAGE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const logger = pino({ level: 'warn' });

// Fonction pour nettoyer les anciens messages
function cleanupProcessedMessages() {
    // On garde le set mais on le vide périodiquement
    if (processedMessages.size > 1000) {
        processedMessages.clear();
        console.log('🧹 Cache messages nettoyé');
    }
}
setInterval(cleanupProcessedMessages, MESSAGE_EXPIRY);

// Fonction pour compresser les images avec sharp
async function compressImage(buffer, maxSizeKB = 500) {
    try {
        const metadata = await sharp(buffer).metadata();
        console.log(`📐 Image originale: ${metadata.width}x${metadata.height}, ${(buffer.length / 1024).toFixed(1)}KB`);
        
        // Si déjà petit, ne pas compresser
        if (buffer.length < maxSizeKB * 1024) {
            console.log('✅ Image déjà optimisée');
            return buffer;
        }
        
        // Calculer le ratio de redimensionnement
        let width = metadata.width;
        let height = metadata.height;
        const maxDimension = 1024;
        
        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round(height * (maxDimension / width));
                width = maxDimension;
            } else {
                width = Math.round(width * (maxDimension / height));
                height = maxDimension;
            }
        }
        
        const compressed = await sharp(buffer)
            .resize(width, height, { fit: 'inside' })
            .jpeg({ quality: 75, progressive: true })
            .toBuffer();
        
        console.log(`✅ Image compressée: ${width}x${height}, ${(compressed.length / 1024).toFixed(1)}KB`);
        return compressed;
    } catch (err) {
        console.error('⚠️ Compression échouée, utilisation originale:', err.message);
        return buffer;
    }
}

// Fonction pour envoyer un fichier avec retry
async function sendFileWithRetry(jid, fileBuffer, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📤 Tentative ${attempt}/${maxRetries} envoi fichier...`);
            await sock.sendMessage(jid, { ...options });
            console.log('✅ Fichier envoyé avec succès!');
            return true;
        } catch (err) {
            console.error(`❌ Tentative ${attempt} échouée:`, err.message);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 2000 * attempt));
            }
        }
    }
    return false;
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: logger,
        browser: ['MoltBot CRM', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
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
            
            // Anti-répétition
            const messageId = msg.key.id;
            if (processedMessages.has(messageId)) {
                console.log(`⏭️ Message ${messageId} déjà traité, ignoré`);
                continue;
            }
            processedMessages.add(messageId);
            
            const from = msg.key.remoteJid;
            const phoneNumber = from.replace('@s.whatsapp.net', '').replace('@lid', '@lid');
            
            console.log(`📩 Message de ${phoneNumber} (ID: ${messageId})`);
            
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
                // Message audio/vocal - CORRECTION IMPORTANTE
                else if (msgContent?.audioMessage) {
                    messageType = 'audio';
                    // Utiliser le bon format MIME pour les vocaux WhatsApp
                    const rawMimeType = msgContent.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                    mediaType = rawMimeType;
                    
                    // Indiquer si c'est un vocal (ptt = push-to-talk)
                    const isVoiceNote = msgContent.audioMessage.ptt === true;
                    console.log(`🎤 Type audio: ${isVoiceNote ? 'Message vocal' : 'Fichier audio'}, MIME: ${rawMimeType}`);
                    
                    try {
                        console.log('🎤 Téléchargement de l\'audio...');
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                            logger,
                            reuploadRequest: sock.updateMediaMessage
                        });
                        mediaBase64 = buffer.toString('base64');
                        console.log(`✅ Audio téléchargé: ${buffer.length} bytes, ${mediaBase64.length} caractères base64`);
                        
                        // Ajouter info vocal pour le backend
                        fileName = isVoiceNote ? 'voice_note.ogg' : 'audio.ogg';
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
                
                // Envoyer au backend avec timeout étendu
                const webhookPayload = {
                    phone_number: phoneNumber,
                    message: textContent,
                    message_type: messageType,
                    message_id: messageId,
                    timestamp: msg.messageTimestamp,
                    media_base64: mediaBase64,
                    media_type: mediaType,
                    file_name: fileName
                };
                
                const response = await axios.post(BACKEND_WEBHOOK_URL, webhookPayload, {
                    timeout: 180000,  // 3 minutes pour laisser le temps à l'IA + transcription
                    headers: { 'Content-Type': 'application/json' },
                    maxContentLength: 100 * 1024 * 1024,  // 100MB max
                    maxBodyLength: 100 * 1024 * 1024
                });
                
                // Traiter la réponse du backend
                const reply = response.data?.reply;
                const documentUrl = response.data?.document_url;
                const documentName = response.data?.document_name || 'document';
                const documentType = response.data?.document_type;
                const isImage = response.data?.is_image;
                
                // Envoyer le texte d'abord si présent
                if (reply) {
                    await sock.sendMessage(from, { text: reply });
                    console.log(`✅ Réponse texte envoyée à ${phoneNumber}`);
                }
                
                // Envoyer le fichier si présent - TOUJOURS en tant que FICHIER, JAMAIS en lien
                if (documentUrl) {
                    try {
                        console.log(`📥 Téléchargement du fichier: ${documentUrl}`);
                        
                        // Télécharger le fichier
                        const fileResponse = await axios.get(documentUrl, {
                            responseType: 'arraybuffer',
                            timeout: 60000,
                            headers: {
                                'User-Agent': 'MoltBot/2.0'
                            }
                        });
                        
                        let fileBuffer = Buffer.from(fileResponse.data);
                        console.log(`📦 Fichier téléchargé: ${(fileBuffer.length / 1024).toFixed(1)}KB`);
                        
                        // Déterminer le type de fichier
                        const contentType = fileResponse.headers['content-type'] || documentType || 'application/octet-stream';
                        const isImageFile = isImage || contentType.startsWith('image/');
                        const isPdf = contentType === 'application/pdf' || documentUrl.toLowerCase().endsWith('.pdf');
                        
                        if (isImageFile) {
                            // Compresser l'image avant envoi
                            try {
                                fileBuffer = await compressImage(fileBuffer);
                            } catch (compErr) {
                                console.log('⚠️ Compression échouée, envoi original');
                            }
                            
                            // Envoyer comme image
                            const success = await sendFileWithRetry(from, fileBuffer, {
                                image: fileBuffer,
                                caption: documentName !== 'document' ? documentName : ''
                            });
                            
                            if (success) {
                                console.log(`✅ Image envoyée: ${documentName}`);
                            } else {
                                console.error('❌ Impossible d\'envoyer l\'image après tous les essais');
                                // NE PAS envoyer de lien en fallback
                            }
                        } else {
                            // Envoyer comme document
                            const success = await sendFileWithRetry(from, fileBuffer, {
                                document: fileBuffer,
                                mimetype: contentType,
                                fileName: documentName
                            });
                            
                            if (success) {
                                console.log(`✅ Document envoyé: ${documentName}`);
                            } else {
                                console.error('❌ Impossible d\'envoyer le document après tous les essais');
                                // NE PAS envoyer de lien en fallback
                            }
                        }
                    } catch (fileErr) {
                        console.error('❌ Erreur envoi fichier:', fileErr.message);
                        // NE PAS envoyer de lien en fallback - c'est ce que l'utilisateur demande
                    }
                }
                
            } catch (error) {
                console.error('❌ Erreur traitement message:', error.message);
                if (error.response) {
                    console.error('Réponse erreur:', error.response.status, typeof error.response.data === 'string' ? error.response.data.substring(0, 200) : error.response.data);
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

// Endpoint pour envoyer une image (avec buffer, pas URL)
app.post('/send-image', async (req, res) => {
    const { phone_number, image_url, image_base64, caption } = req.body;
    
    if (!sock || connectionStatus !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp non connecté' });
    }
    
    try {
        const jid = phone_number.includes('@') ? phone_number : `${phone_number.replace('+', '')}@s.whatsapp.net`;
        
        let imageBuffer;
        if (image_base64) {
            imageBuffer = Buffer.from(image_base64, 'base64');
        } else if (image_url) {
            const response = await axios.get(image_url, { 
                responseType: 'arraybuffer',
                timeout: 30000 
            });
            imageBuffer = Buffer.from(response.data);
        } else {
            return res.status(400).json({ error: 'image_url ou image_base64 requis' });
        }
        
        // Compresser l'image
        imageBuffer = await compressImage(imageBuffer);
        
        await sock.sendMessage(jid, { 
            image: imageBuffer, 
            caption: caption || '' 
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur envoi image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pour envoyer un document (avec buffer, pas URL)
app.post('/send-document', async (req, res) => {
    const { phone_number, document_url, document_base64, filename, mimetype, caption } = req.body;
    
    if (!sock || connectionStatus !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp non connecté' });
    }
    
    try {
        const jid = phone_number.includes('@') ? phone_number : `${phone_number.replace('+', '')}@s.whatsapp.net`;
        
        let docBuffer;
        let contentType = mimetype || 'application/octet-stream';
        
        if (document_base64) {
            docBuffer = Buffer.from(document_base64, 'base64');
        } else if (document_url) {
            const response = await axios.get(document_url, { 
                responseType: 'arraybuffer',
                timeout: 60000 
            });
            docBuffer = Buffer.from(response.data);
            contentType = response.headers['content-type'] || contentType;
        } else {
            return res.status(400).json({ error: 'document_url ou document_base64 requis' });
        }
        
        await sock.sendMessage(jid, { 
            document: docBuffer, 
            mimetype: contentType,
            fileName: filename || 'document',
            caption: caption || ''
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur envoi document:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        whatsapp: connectionStatus,
        uptime: process.uptime()
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur WhatsApp démarré sur le port ${PORT}`);
    connectToWhatsApp();
});
```

---

## Variables d'environnement Railway

```env
BACKEND_WEBHOOK_URL=https://alphagency.fr/api/whatsapp/webhook
NODE_ENV=production
```

⚠️ **IMPORTANT**: Utilisez **alphagency.fr** (production), PAS l'URL preview!

---

## Après déploiement - Tests à effectuer

1. **Test audio**: Envoyez un message vocal et vérifiez la transcription
2. **Test image**: Demandez "génère une image d'un chat" et vérifiez que c'est un fichier (pas un lien)
3. **Test devis**: Demandez "crée un devis pour Test" et vérifiez que le PDF arrive en fichier

---

## Changelog v2.0.0

- ✅ Ajout `sharp@^0.32.6` pour compression images
- ✅ Timeout webhook augmenté à 3 minutes (180s)
- ✅ Correction format MIME audio vocal
- ✅ Anti-répétition de messages
- ✅ Retry automatique (3 tentatives) pour envoi fichiers
- ✅ **SUPPRESSION du fallback URL** - Si l'envoi de fichier échoue, plus de lien envoyé
- ✅ Logs améliorés pour debug
