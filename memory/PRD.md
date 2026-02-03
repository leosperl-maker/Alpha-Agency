# Alpha Agency CRM & Social Media Management Tool

## Overview
A comprehensive CRM and social media management tool for Alpha Agency, featuring client management, invoicing, task tracking, editorial calendar, Multilink module, and now **MoltBot** - an integrated AI assistant with full CRM access.

## Core Features

### 1. CRM Module
- Contact management (clients, prospects, leads)
- Pipeline management with drag-and-drop
- Task management with priorities and due dates
- Invoicing and quotes system
- Budget tracking

### 2. Social Media Management
- Editorial calendar for content planning
- Multi-platform publishing (Meta, LinkedIn, TikTok)
- AI-powered features (post ideas, hashtags, best time)
- Sandbox mode for Meta and TikTok testing

### 3. Multilink Module (zaap.bio clone)
- Custom bio link pages
- Multiple block types (links, social, text, images)
- Design customization (colors, themes, fonts)
- QR code generation
- Analytics (views, clicks)
- Custom domain support

### 4. Blog Module
- Rich content editor with blocks
- Auto-publish API for n8n/automation workflows
- **Content blocks with inline images support** (NEW)
- SEO optimization
- Scheduled publishing

### 5. MoltBot Integration (NEW - MAJOR FEATURE)
**Full CRM AI Assistant replacing the previous Assistant IA**

#### Core Capabilities:
- Complete CRM read/write access via chat
- Contact, Invoice, Quote, Task management
- Appointment creation with Google Meet invitations
- Document search and retrieval
- Global search across all CRM data
- Business intelligence (stats, briefings, recaps)

#### Security Model:
- **Admin Mode:** Full CRM access for whitelisted phone numbers
- **Public Mode:** Limited FAQ access for website visitors

#### Communication Channels:
- Dashboard chat interface
- WhatsApp bidirectional (planned)
- Telegram (planned)
- Website chat widget

#### Daily Automations:
- Morning briefing (tasks, RDV, alerts)
- Evening recap (completed tasks, tomorrow preview)
- Real-time alerts (new leads, payments, overdue)

### 6. Website Chat Widget (NEW)
- Public FAQ chatbot on the website
- Keyword-based intelligent responses
- Lead capture form
- Quick questions suggestions
- Seamless contact form integration

### 7. PWA Widget for iPhone (NEW)
- Mobile-optimized dashboard at `/widget`
- Today's tasks with completion toggle
- Quick stats (CA, leads)
- Today's appointments
- Alerts section
- Add to Home Screen ready

### 8. Business Search API (NEW)
- SIRET/SIREN company lookup
- French government API integration
- Auto-fill client information

### 9. PWA / Offline Mode
- Service worker for offline caching
- Online status indicator
- Safe area support for iOS notch

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Recharts, Framer Motion
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **Integrations:** 
  - Emergent LLM Key (AI features)
  - Meta API (Facebook/Instagram)
  - LinkedIn API
  - TikTok API (Sandbox)
  - Cloudinary (Media)
  - Brevo (Email)
  - Google Calendar API
  - entreprise.data.gouv.fr (Business search)

## Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── moltbot.py         # NEW: Full MoltBot CRM API
│   │   ├── business_search.py  # NEW: SIRET/Kbis lookup
│   │   ├── blog.py            # Blog API with content_blocks
│   │   ├── editorial.py       # AI-powered social features
│   │   ├── multilink.py       # Multilink pages API
│   │   ├── meta.py            # Meta (FB/IG) integration
│   │   └── ...
│   └── server.py              # Main API + legacy moltbot webhook
└── frontend/
    └── src/
        ├── components/
        │   ├── ChatWidget.jsx      # NEW: Public FAQ chatbot
        │   ├── Navbar.jsx          # Phone hidden on blog pages
        │   └── MainLayout.jsx      # Includes ChatWidget
        ├── pages/
        │   ├── WidgetPage.jsx      # NEW: PWA Widget for iPhone
        │   ├── dashboard/
        │   │   ├── MoltBotPage.jsx     # NEW: Full MoltBot interface
        │   │   ├── DashboardLayout.jsx
        │   │   └── ...
        │   └── public/
        │       └── LinkBioPage.jsx
        └── index.css               # PWA safe-area CSS
```

## Changelog

### 2026-02-03 (Current Session - MAJOR UPDATE)

#### MoltBot Complete Implementation
- **Backend API (`/api/moltbot/`):**
  - Full CRUD for contacts, tasks, invoices, appointments
  - Global search across all CRM data
  - Business stats (CA, leads, tasks)
  - Daily briefing and evening recap endpoints
  - Reminders system
  - Security: Admin vs Public access levels
  - Business search (SIRET/SIREN integration)

- **Frontend MoltBot Page:**
  - Chat interface with command processing
  - Quick action buttons
  - Stats sidebar
  - Daily briefing banner
  - WhatsApp integration section
  - Settings panel

- **Website Chat Widget:**
  - Public FAQ chatbot
  - Keyword-based responses
  - Lead capture form
  - Quick questions

- **PWA Widget for iPhone:**
  - `/widget` route
  - Mobile-optimized design
  - Task list with completion
  - Stats and alerts

#### Blog API Enhanced
- `content_blocks` field for inline images
- `content` now optional (use either)
- Updated API documentation

#### UI Fixes
- Phone button hidden on `/actualites/*` and `/blog/*`
- Fixed MoltBot page X import error

#### PWA/Mobile Enhancements
- Safe area CSS variables
- PWA standalone mode support
- Responsive grid utilities

### Previous Sessions
- Blog auto-publish API
- Mobile responsive fixes
- Critical dashboard bug fix (TDZ error)
- Custom domain support (Cloudflare for SaaS solution)

## API Reference

### MoltBot API (Admin)
```
GET  /api/moltbot/contacts?search=...
GET  /api/moltbot/contacts/{id}
POST /api/moltbot/contacts

GET  /api/moltbot/tasks?status=todo
POST /api/moltbot/tasks
PUT  /api/moltbot/tasks/{id}/complete

GET  /api/moltbot/invoices?type=devis
POST /api/moltbot/invoices
PUT  /api/moltbot/invoices/{id}/add-item

GET  /api/moltbot/appointments?upcoming=true
POST /api/moltbot/appointments

GET  /api/moltbot/documents?search=...
POST /api/moltbot/search

GET  /api/moltbot/stats?period=month
GET  /api/moltbot/briefing
GET  /api/moltbot/recap

GET  /api/moltbot/business-search?query=...

Headers required:
- X-MoltBot-Secret: moltbot-alpha-secret-2024
  OR
- X-MoltBot-Phone: [admin phone number]
```

### MoltBot API (Public)
```
GET  /api/moltbot/public/faq
POST /api/moltbot/public/inquiry?name=...&email=...&message=...
```

### Blog Auto-Publish API
```
POST /api/blog/auto-publish
Headers:
  X-API-Key: blog-alpha-auto-publish-2024-secure

Body (with content_blocks):
{
  "title": "Article Title",
  "content_blocks": [
    {"type": "heading", "content": "Title", "level": 1},
    {"type": "text", "content": "Paragraph..."},
    {"type": "image", "url": "...", "caption": "...", "alignment": "center"},
    ...
  ]
}
```

## Pending Issues

### P1 - High Priority
1. **Missing Meta Accounts** - Some FB/IG accounts not appearing
2. **Comment Moderation** - Backend + UI for approving/deleting comments
3. **WhatsApp Integration** - Connect MoltBot to actual WhatsApp

### P2 - Medium Priority
1. **Multi-platform Post Preview** - Show how posts appear on platforms
2. **Detailed Multilink Analytics** - Click tracking by link
3. **Gmail Integration** - Read emails via MoltBot
4. **Google Drive Integration** - Document sync

## Future Roadmap

### Phase 1 (Next)
- WhatsApp Business API integration
- Telegram bot connection
- Comment management in CRM
- Enhanced analytics

### Phase 2
- Story Editor + Scheduler (Storrito clone)
- Voice-to-CRM (audio messages)
- Gmail/Drive integration
- Automated follow-ups

### Phase 3
- AI predictions (close probability)
- Competitor monitoring
- Multi-language support
- Advanced reporting with PDF exports

## Test Credentials
- **Email:** admin@alphagency.fr
- **Password:** Test123!
- **Blog API Key:** blog-alpha-auto-publish-2024-secure
- **MoltBot Secret:** moltbot-alpha-secret-2024

## Known Limitations
- **Mocked:** Meta Inbox, TikTok (Sandbox mode)
- **Blocked:** LinkedIn posting, Instagram Stories API
- **Custom Domain SSL:** Requires Cloudflare for SaaS setup
- **Business Search:** French gov API may have rate limits

## URLs
- **Preview:** https://marketingcore.preview.emergentagent.com
- **PWA Widget:** https://marketingcore.preview.emergentagent.com/widget
- **MoltBot Admin:** https://marketingcore.preview.emergentagent.com/admin/moltbot
