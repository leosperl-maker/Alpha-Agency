/**
 * WhatsApp Service for MoltBot CRM
 * Uses Baileys to connect to WhatsApp Web
 * Provides REST API for sending/receiving messages
 */

const express = require('express');
const cors = require('cors');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.WHATSAPP_PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';
const MOLTBOT_SECRET = process.env.MOLTBOT_SECRET || 'moltbot-alpha-secret-2024';

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Logger
const logger = pino({ level: 'info' });

// State
let sock = null;
let qrCode = null;
let connectionStatus = {
    connected: false,
    phoneNumber: null,
    name: null,
    lastConnected: null
};

// Auth state directory
const AUTH_DIR = path.join(__dirname, 'auth_info');

/**
 * Initialize WhatsApp connection
 */
async function connectToWhatsApp() {
    try {
        // Ensure auth directory exists
        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
        }

        // Get auth state
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        
        // Get latest version
        const { version } = await fetchLatestBaileysVersion();
        
        // Create socket
        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            generateHighQualityLinkPreview: true
        });

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                // Generate QR code
                qrCode = await QRCode.toDataURL(qr);
                logger.info('QR Code generated - scan with WhatsApp');
                console.log('\n📱 Scannez le QR code avec WhatsApp pour connecter MoltBot\n');
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed. Reconnecting: ${shouldReconnect}`);
                
                connectionStatus.connected = false;
                qrCode = null;
                
                if (shouldReconnect) {
                    setTimeout(connectToWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                logger.info('WhatsApp connected!');
                console.log('\n✅ WhatsApp connecté avec succès!\n');
                
                connectionStatus.connected = true;
                connectionStatus.lastConnected = new Date().toISOString();
                qrCode = null;
                
                // Get profile info
                try {
                    const user = sock.user;
                    if (user) {
                        connectionStatus.phoneNumber = user.id.split(':')[0];
                        connectionStatus.name = user.name || user.verifiedName;
                        logger.info(`Connected as: ${connectionStatus.name} (${connectionStatus.phoneNumber})`);
                    }
                } catch (e) {
                    logger.error('Error getting user info:', e);
                }
            }
        });

        // Handle credentials update
        sock.ev.on('creds.update', saveCreds);

        // Handle incoming messages
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const msg of messages) {
                // Skip if no message content
                if (!msg.message) continue;
                
                // Skip status updates
                if (msg.key.remoteJid === 'status@broadcast') continue;
                
                // Skip outgoing messages (from us)
                if (msg.key.fromMe) continue;
                
                const senderNumber = msg.key.remoteJid.replace('@s.whatsapp.net', '');
                
                // Determine message type and content
                let messageType = 'text';
                let messageText = '';
                let audioBuffer = null;
                
                // Check for audio/voice message
                const audioMessage = msg.message.audioMessage;
                if (audioMessage) {
                    messageType = 'audio';
                    logger.info(`Audio message from ${senderNumber}, duration: ${audioMessage.seconds}s`);
                    
                    // Download audio
                    try {
                        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                        audioBuffer = await downloadMediaMessage(msg, 'buffer', {});
                        logger.info(`Audio downloaded: ${audioBuffer.length} bytes`);
                    } catch (dlErr) {
                        logger.error('Error downloading audio:', dlErr);
                    }
                }
                // Check for video message (might contain voice)
                else if (msg.message.videoMessage) {
                    messageType = 'video';
                    messageText = msg.message.videoMessage.caption || '';
                    logger.info(`Video message from ${senderNumber}`);
                }
                // Check for image message
                else if (msg.message.imageMessage) {
                    messageType = 'image';
                    messageText = msg.message.imageMessage.caption || '';
                    logger.info(`Image message from ${senderNumber}: ${messageText}`);
                }
                // Check for document
                else if (msg.message.documentMessage) {
                    messageType = 'document';
                    messageText = msg.message.documentMessage.fileName || '';
                    logger.info(`Document from ${senderNumber}: ${messageText}`);
                }
                // Standard text message
                else {
                    messageText = msg.message.conversation || 
                        msg.message.extendedTextMessage?.text || 
                        '';
                    
                    if (!messageText) continue;
                    logger.info(`Text message from ${senderNumber}: ${messageText}`);
                }
                
                // Build webhook payload
                const webhookPayload = {
                    phone_number: senderNumber,
                    message: messageText,
                    message_id: msg.key.id,
                    timestamp: msg.messageTimestamp,
                    message_type: messageType
                };
                
                // If audio, save to temp file and get URL
                if (audioBuffer) {
                    try {
                        const tempPath = `/tmp/wa_audio_${msg.key.id}.ogg`;
                        require('fs').writeFileSync(tempPath, audioBuffer);
                        webhookPayload.audio_path = tempPath;
                        logger.info(`Audio saved to: ${tempPath}`);
                    } catch (saveErr) {
                        logger.error('Error saving audio:', saveErr);
                    }
                }
                
                // Send to backend webhook
                try {
                    const response = await fetch(`${BACKEND_URL}/api/whatsapp/webhook`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-MoltBot-Secret': MOLTBOT_SECRET
                        },
                        body: JSON.stringify(webhookPayload)
                    });
                    
                    const data = await response.json();
                    
                    // Send reply if provided
                    if (data.reply) {
                        await sendMessage(senderNumber, data.reply);
                    }
                } catch (error) {
                    logger.error('Error sending to backend:', error);
                }
            }
        });

    } catch (error) {
        logger.error('Connection error:', error);
        setTimeout(connectToWhatsApp, 10000);
    }
}

/**
 * Send a WhatsApp message
 */
async function sendMessage(phoneNumber, message) {
    if (!sock || !connectionStatus.connected) {
        throw new Error('WhatsApp not connected');
    }
    
    // Format phone number
    let jid = phoneNumber.replace(/[^0-9]/g, '');
    if (!jid.includes('@')) {
        jid = `${jid}@s.whatsapp.net`;
    }
    
    try {
        await sock.sendMessage(jid, { text: message });
        logger.info(`Message sent to ${phoneNumber}`);
        return { success: true };
    } catch (error) {
        logger.error('Error sending message:', error);
        throw error;
    }
}

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'whatsapp-service' });
});

// Get connection status
app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus.connected,
        phone_number: connectionStatus.phoneNumber,
        name: connectionStatus.name,
        last_connected: connectionStatus.lastConnected
    });
});

// Get QR code for authentication
app.get('/qr', (req, res) => {
    if (connectionStatus.connected) {
        res.json({ 
            qr: null, 
            message: 'Déjà connecté',
            connected: true 
        });
    } else if (qrCode) {
        res.json({ 
            qr: qrCode, 
            message: 'Scannez le QR code avec WhatsApp',
            connected: false 
        });
    } else {
        res.json({ 
            qr: null, 
            message: 'QR code en cours de génération...',
            connected: false 
        });
    }
});

// Send a message
app.post('/send', async (req, res) => {
    const { phone_number, message } = req.body;
    
    if (!phone_number || !message) {
        return res.status(400).json({ error: 'phone_number and message required' });
    }
    
    try {
        await sendMessage(phone_number, message);
        res.json({ success: true, message: 'Message envoyé' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disconnect
app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            connectionStatus.connected = false;
            connectionStatus.phoneNumber = null;
            connectionStatus.name = null;
        }
        res.json({ success: true, message: 'Déconnecté' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile name
app.post('/profile/name', async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'name is required' });
    }
    
    if (!sock || !connectionStatus.connected) {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    
    try {
        await sock.updateProfileName(name);
        connectionStatus.name = name;
        logger.info(`Profile name updated to: ${name}`);
        res.json({ success: true, message: `Nom changé en: ${name}` });
    } catch (error) {
        logger.error('Error updating profile name:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update profile picture
app.post('/profile/picture', async (req, res) => {
    const { image_url, image_base64 } = req.body;
    
    if (!image_url && !image_base64) {
        return res.status(400).json({ error: 'image_url or image_base64 is required' });
    }
    
    if (!sock || !connectionStatus.connected) {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    
    try {
        let imageBuffer;
        
        if (image_base64) {
            // Decode base64
            imageBuffer = Buffer.from(image_base64, 'base64');
        } else if (image_url) {
            // Download from URL
            const response = await fetch(image_url);
            if (!response.ok) {
                throw new Error('Failed to download image');
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        }
        
        // Update profile picture (requires own JID)
        const ownJid = sock.user.id;
        await sock.updateProfilePicture(ownJid, imageBuffer);
        
        logger.info('Profile picture updated');
        res.json({ success: true, message: 'Photo de profil mise à jour' });
    } catch (error) {
        logger.error('Error updating profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current profile info
app.get('/profile', async (req, res) => {
    if (!sock || !connectionStatus.connected) {
        return res.json({ 
            connected: false,
            name: null,
            phone_number: null 
        });
    }
    
    try {
        const ownJid = sock.user.id;
        let profilePicUrl = null;
        
        try {
            profilePicUrl = await sock.profilePictureUrl(ownJid, 'image');
        } catch (e) {
            // No profile picture set
        }
        
        res.json({
            connected: true,
            name: connectionStatus.name,
            phone_number: connectionStatus.phoneNumber,
            profile_picture: profilePicUrl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send a document (PDF, etc.)
app.post('/send-document', async (req, res) => {
    const { phone_number, document_url, filename, caption } = req.body;
    
    if (!phone_number || !document_url) {
        return res.status(400).json({ error: 'phone_number and document_url required' });
    }
    
    if (!sock || !connectionStatus.connected) {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    
    try {
        // Format phone number
        let jid = phone_number.replace(/[^0-9]/g, '');
        if (!jid.includes('@')) {
            jid = `${jid}@s.whatsapp.net`;
        }
        
        // Download the document
        const response = await fetch(document_url);
        if (!response.ok) {
            throw new Error('Failed to download document');
        }
        const arrayBuffer = await response.arrayBuffer();
        const documentBuffer = Buffer.from(arrayBuffer);
        
        // Determine mimetype from filename
        let mimetype = 'application/pdf';
        if (filename) {
            if (filename.endsWith('.pdf')) mimetype = 'application/pdf';
            else if (filename.endsWith('.doc') || filename.endsWith('.docx')) mimetype = 'application/msword';
            else if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) mimetype = 'application/vnd.ms-excel';
        }
        
        // Send document
        await sock.sendMessage(jid, {
            document: documentBuffer,
            mimetype: mimetype,
            fileName: filename || 'document.pdf',
            caption: caption || ''
        });
        
        logger.info(`Document sent to ${phone_number}: ${filename}`);
        res.json({ success: true, message: 'Document envoyé' });
    } catch (error) {
        logger.error('Error sending document:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send an image
app.post('/send-image', async (req, res) => {
    const { phone_number, image_url, caption } = req.body;
    
    if (!phone_number || !image_url) {
        return res.status(400).json({ error: 'phone_number and image_url required' });
    }
    
    if (!sock || !connectionStatus.connected) {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    
    try {
        // Format phone number
        let jid = phone_number.replace(/[^0-9]/g, '');
        if (!jid.includes('@')) {
            jid = `${jid}@s.whatsapp.net`;
        }
        
        // Download the image
        const response = await fetch(image_url);
        if (!response.ok) {
            throw new Error('Failed to download image');
        }
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        
        // Send image
        await sock.sendMessage(jid, {
            image: imageBuffer,
            caption: caption || ''
        });
        
        logger.info(`Image sent to ${phone_number}`);
        res.json({ success: true, message: 'Image envoyée' });
    } catch (error) {
        logger.error('Error sending image:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          🤖 MoltBot WhatsApp Service                     ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                             ║
║  Backend: ${BACKEND_URL}                    ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║  - GET  /status    → État de connexion                   ║
║  - GET  /qr        → QR code pour connexion              ║
║  - POST /send      → Envoyer un message                  ║
║  - POST /disconnect → Déconnecter                        ║
╚══════════════════════════════════════════════════════════╝
    `);
    
    // Start WhatsApp connection
    connectToWhatsApp();
});
