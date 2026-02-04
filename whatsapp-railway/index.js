/**
 * WhatsApp Service for MoltBot CRM - Railway Version
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

// Configuration - Railway provides PORT automatically
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'https://alphagency.fr';
const MOLTBOT_SECRET = process.env.MOLTBOT_SECRET || 'moltbot-alpha-secret-2024';

const app = express();
app.use(cors());
app.use(express.json());

const logger = pino({ level: 'info' });

let sock = null;
let qrCode = null;
let connectionStatus = {
    connected: false,
    phoneNumber: null,
    name: null,
    lastConnected: null
};

const AUTH_DIR = path.join(__dirname, 'auth_info');

async function connectToWhatsApp() {
    try {
        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();
        
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

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                qrCode = await QRCode.toDataURL(qr);
                logger.info('QR Code generated');
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                connectionStatus.connected = false;
                qrCode = null;
                if (shouldReconnect) {
                    setTimeout(connectToWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                logger.info('WhatsApp connected!');
                connectionStatus.connected = true;
                connectionStatus.lastConnected = new Date().toISOString();
                qrCode = null;
                
                try {
                    const user = sock.user;
                    if (user) {
                        connectionStatus.phoneNumber = user.id.split(':')[0];
                        connectionStatus.name = user.name || user.verifiedName;
                    }
                } catch (e) {
                    logger.error('Error getting user info:', e);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const msg of messages) {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.fromMe) continue;
                
                const senderNumber = msg.key.remoteJid.replace('@s.whatsapp.net', '');
                let messageType = 'text';
                let messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                
                if (msg.message.audioMessage) {
                    messageType = 'audio';
                } else if (msg.message.imageMessage) {
                    messageType = 'image';
                    messageText = msg.message.imageMessage.caption || '';
                }
                
                if (!messageText && messageType === 'text') continue;
                
                try {
                    const response = await fetch(`${BACKEND_URL}/api/whatsapp/webhook`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-MoltBot-Secret': MOLTBOT_SECRET
                        },
                        body: JSON.stringify({
                            phone_number: senderNumber,
                            message: messageText,
                            message_id: msg.key.id,
                            timestamp: msg.messageTimestamp,
                            message_type: messageType
                        })
                    });
                    
                    const data = await response.json();
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

async function sendMessage(phoneNumber, message) {
    if (!sock || !connectionStatus.connected) {
        throw new Error('WhatsApp not connected');
    }
    
    let jid = phoneNumber.replace(/[^0-9]/g, '');
    if (!jid.includes('@')) {
        jid = `${jid}@s.whatsapp.net`;
    }
    
    await sock.sendMessage(jid, { text: message });
    return { success: true };
}

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus.connected,
        phone_number: connectionStatus.phoneNumber,
        name: connectionStatus.name,
        last_connected: connectionStatus.lastConnected
    });
});

app.get('/qr', (req, res) => {
    if (connectionStatus.connected) {
        res.json({ qr: null, message: 'Déjà connecté', connected: true });
    } else if (qrCode) {
        res.json({ qr: qrCode, message: 'Scannez le QR code', connected: false });
    } else {
        res.json({ qr: null, message: 'QR code en génération...', connected: false });
    }
});

app.post('/send', async (req, res) => {
    const { phone_number, message } = req.body;
    if (!phone_number || !message) {
        return res.status(400).json({ error: 'phone_number and message required' });
    }
    try {
        await sendMessage(phone_number, message);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            connectionStatus.connected = false;
            connectionStatus.phoneNumber = null;
            connectionStatus.name = null;
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/profile', async (req, res) => {
    if (!sock || !connectionStatus.connected) {
        return res.json({ connected: false });
    }
    try {
        let profilePicUrl = null;
        try {
            profilePicUrl = await sock.profilePictureUrl(sock.user.id, 'image');
        } catch (e) {}
        
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

app.post('/profile/name', async (req, res) => {
    const { name } = req.body;
    if (!name || !sock || !connectionStatus.connected) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    try {
        await sock.updateProfileName(name);
        connectionStatus.name = name;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/profile/picture', async (req, res) => {
    const { image_base64, image_url } = req.body;
    if (!sock || !connectionStatus.connected) {
        return res.status(400).json({ error: 'Not connected' });
    }
    try {
        let imageBuffer;
        if (image_base64) {
            imageBuffer = Buffer.from(image_base64, 'base64');
        } else if (image_url) {
            const response = await fetch(image_url);
            imageBuffer = Buffer.from(await response.arrayBuffer());
        }
        await sock.updateProfilePicture(sock.user.id, imageBuffer);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-document', async (req, res) => {
    const { phone_number, document_url, filename, caption } = req.body;
    if (!phone_number || !document_url || !sock || !connectionStatus.connected) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    try {
        let jid = phone_number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const response = await fetch(document_url);
        const documentBuffer = Buffer.from(await response.arrayBuffer());
        
        await sock.sendMessage(jid, {
            document: documentBuffer,
            mimetype: 'application/pdf',
            fileName: filename || 'document.pdf',
            caption: caption || ''
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start
app.listen(PORT, () => {
    console.log(`WhatsApp Service running on port ${PORT}`);
    connectToWhatsApp();
});
