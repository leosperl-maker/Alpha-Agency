# Alpha Agency CRM & Social Media Management Tool

## Overview
A comprehensive CRM and social media management tool for Alpha Agency, featuring client management, invoicing, task tracking, editorial calendar, and a Multilink module (zaap.bio clone).

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
- AI-powered features:
  - Post ideas generation
  - Hashtag suggestions
  - Best time to post analysis
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
- Content blocks with inline images support
- SEO optimization (title, description)
- Scheduled publishing

### 5. MoltBot Integration
- Autonomous AI chatbot connected to Telegram/WhatsApp
- CRM webhook integration for automatic contact/task creation
- Dashboard page for configuration at `/admin/moltbot`

### 6. PWA / Offline Mode
- Service worker for offline caching
- Online status indicator
- Basic offline functionality
- Safe area support for iOS notch/home indicator

### 7. UI/UX Enhancements
- Command palette (⌘K) for quick navigation
- Keyboard shortcuts (G+D for Dashboard, etc.)
- Mobile-responsive design
- Dark theme

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Recharts
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
  - MoltBot (Autonomous AI Agent)

## Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── blog.py           # Blog API with auto-publish + content_blocks
│   │   ├── editorial.py      # AI-powered social features
│   │   ├── multilink.py      # Multilink pages API
│   │   ├── meta.py           # Meta (FB/IG) integration
│   │   └── ...
│   └── server.py             # Main API + MoltBot webhook
└── frontend/
    └── src/
        ├── components/
        │   ├── CustomDomainHandler.jsx
        │   ├── Navbar.jsx          # Phone button hidden on blog pages
        │   └── ui/                 # Shadcn components
        ├── pages/
        │   ├── dashboard/
        │   │   ├── DashboardLayout.jsx
        │   │   ├── DashboardOverview.jsx
        │   │   ├── EditorialCalendarPage.jsx
        │   │   ├── MultilinkPage.jsx
        │   │   └── MoltBotPage.jsx   # NEW: MoltBot configuration
        │   └── public/
        │       └── LinkBioPage.jsx
        └── hooks/
            └── useOnlineStatus.js
```

## Changelog

### 2026-02-03 (Current Session)
- **API Blog Enhanced:** Support for `content_blocks` with inline images
  - `content` is now optional (use either `content` or `content_blocks`)
  - New structure supports: heading, text, image, quote blocks
  - Each image block supports: url, caption, alignment, size
  - Updated API documentation at `/api/blog/api-info`
  
- **UI Fix:** Phone button hidden on blog/actualités pages
  - Sticky phone CTA no longer overlaps share buttons on article pages
  - Condition added in `Navbar.jsx` for `/actualites/*` and `/blog/*` routes
  
- **MoltBot Integration:**
  - New dashboard page at `/admin/moltbot`
  - Webhook endpoint `POST /api/moltbot/webhook` for CRM sync
  - Supports: contact_create, task_create, message events
  - Documentation and setup guide included in the page
  
- **PWA/Mobile Enhancements:**
  - Safe area CSS variables for iOS notch support
  - PWA standalone mode detection
  - Minimum 44px touch targets
  - Prevent iOS zoom on input focus
  - Responsive grid utilities (kpi-grid, grid-responsive)

### 2026-02-01
- **NEW FEATURE:** API Blog Automatisée pour n8n
  - Endpoint `POST /api/blog/auto-publish` avec authentification par clé API
  - Conversion automatique Markdown/HTML → content blocks
  - Support publication immédiate ou programmée (`publish_at`)
  - Champ `source_ia` pour stocker le payload IA (audit/replay)
  - Endpoint `POST /api/blog/publish-scheduled` pour CRON
  - Documentation API sur `GET /api/blog/api-info`

### 2026-01-31 (Session 2)
- **MOBILE RESPONSIVE:** Optimisation complète des pages principales
  - Dashboard: stats scrollables, KPIs 2 colonnes, graphiques adaptés
  - Calendrier Éditorial: boutons compacts, filtres empilés, calendriers scrollables
  - Multilink: header responsive, liste pages en scroll horizontal
  - Social Media: padding et navigation optimisés
- **BUG FIX (P0):** Fixed critical "black screen" bug on admin dashboard
  - Cause: TDZ error - `lastKeyPressed` used before declaration in `DashboardLayout.jsx`
- **BUG FIX (P1):** TikTok Sandbox banner no longer appears automatically
  - Banner only shows when user explicitly activates demo mode
  - "Quitter le mode démo" button now properly disables sandbox

### Previous Session (Completed)
- Custom domain support for Multilink pages
- QR code generation for Multilink
- Mobile scroll fix for tabs
- Command palette (⌘K) implementation
- Keyboard shortcuts
- PWA / Offline mode with service worker
- AI-powered editorial features (post ideas, hashtags, best time)
- Admin dashboard redesign

## API Reference

### Blog Auto-Publish API
```
POST /api/blog/auto-publish
Headers:
  X-API-Key: blog-alpha-auto-publish-2024-secure
  Content-Type: application/json

Body (with content):
{
  "title": "Article Title",
  "content": "## Markdown content...",
  "content_format": "markdown",
  ...
}

Body (with content_blocks):
{
  "title": "Article with Images",
  "content_blocks": [
    {"type": "heading", "content": "Title", "level": 1},
    {"type": "text", "content": "Paragraph..."},
    {"type": "image", "url": "https://...", "caption": "Caption", "alignment": "center", "size": "large"},
    ...
  ],
  ...
}
```

### MoltBot Webhook
```
POST /api/moltbot/webhook
Content-Type: application/json

Body:
{
  "event_type": "contact_create" | "task_create" | "message",
  "platform": "telegram" | "whatsapp",
  "data": { ... }
}
```

## Pending Issues

### P1 - High Priority
1. **Missing Meta Accounts** - Some Facebook/Instagram accounts not appearing in list
2. **Comment Moderation** - Backend and UI for approving/deleting blog comments

### P2 - Medium Priority
1. **Multi-platform Post Preview** - Show how posts appear on different platforms
2. **Detailed Multilink Analytics** - Click tracking by specific link
3. **Slow Multilink Public Pages** - Optimize loading of `LinkBioPage.jsx`

## Future Roadmap

### Phase 1 (Next)
- Story Editor + Scheduler (Storrito clone)
- Full comment management in CRM
- Enhanced analytics with PDF exports

### Phase 2
- Client management improvements (notes, contract alerts)
- Advanced AI suggestions in editorial calendar

## Test Credentials
- **Email:** admin@alphagency.fr
- **Password:** Test123!
- **Blog API Key:** blog-alpha-auto-publish-2024-secure

## Known Limitations
- **Mocked:** Meta Inbox, TikTok (Sandbox mode)
- **Blocked:** LinkedIn posting (connection only)
- **Custom Domain SSL:** Requires Cloudflare for SaaS setup by user
