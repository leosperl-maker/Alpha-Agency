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

### 4. PWA / Offline Mode
- Service worker for offline caching
- Online status indicator
- Basic offline functionality

### 5. UI/UX Enhancements
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

## Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── editorial.py    # AI-powered social features
│   │   ├── multilink.py    # Multilink pages API
│   │   ├── meta.py         # Meta (FB/IG) integration
│   │   └── ...
│   └── server.py
└── frontend/
    └── src/
        ├── components/
        │   ├── CustomDomainHandler.jsx
        │   └── ui/          # Shadcn components
        ├── pages/
        │   ├── dashboard/
        │   │   ├── DashboardLayout.jsx
        │   │   ├── DashboardOverview.jsx
        │   │   ├── EditorialCalendarPage.jsx
        │   │   └── MultilinkPage.jsx
        │   └── public/
        │       └── LinkBioPage.jsx
        └── hooks/
            └── useOnlineStatus.js
```

## Changelog

### 2026-01-31
- **BUG FIX (P0):** Fixed critical "black screen" bug on admin dashboard
  - Cause: TDZ error - `lastKeyPressed` used before declaration in `DashboardLayout.jsx`
  - Solution: Moved useState declarations before useEffect that uses them

### Previous Session (Completed)
- Custom domain support for Multilink pages
- QR code generation for Multilink
- Mobile scroll fix for tabs
- Command palette (⌘K) implementation
- Keyboard shortcuts
- PWA / Offline mode with service worker
- AI-powered editorial features (post ideas, hashtags, best time)
- Admin dashboard redesign

## Pending Issues

### P1 - High Priority
1. **Slow Multilink Public Pages** - Optimize loading of `LinkBioPage.jsx`
2. **Missing Meta Accounts** - Some Facebook/Instagram accounts not appearing in list

### P2 - Medium Priority
1. **Multi-platform Post Preview** - Show how posts appear on different platforms
2. **Detailed Multilink Analytics** - Click tracking by specific link

## Future Roadmap

### Phase 1 (Next)
- Story Editor + Scheduler (Storrito clone)
- Enhanced analytics with PDF exports

### Phase 2
- Client management improvements (notes, contract alerts)
- Advanced AI suggestions in editorial calendar

## Test Credentials
- **Email:** admin@alphagency.fr
- **Password:** Test123!

## Known Limitations
- **Mocked:** Meta Inbox, TikTok (Sandbox mode)
- **Blocked:** LinkedIn posting (connection only)
