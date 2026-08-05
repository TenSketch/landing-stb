# STB Singapore — Product Requirements Document

## Original Problem Statement
Landing page for STB Singapore (private-chauffeur / tour-booking). Pure HTML + Vanilla JS + CSS for SEO. Extract brand from logo. SMTP guest+admin booking emails via Gmail. Route-based distance pricing. Guest reminder email 12 hours before pickup. Deploy target: **Vercel** (static + serverless).

## Deployment Architecture (Vercel-native)
- Static frontend (`index.html`, `/src/*`, `/stb-logo.png`) — served from Vercel CDN
- Serverless functions in `/api/*`:
  - `POST /api/bookings` — create booking, send guest + admin emails
  - `GET/POST /api/assign/[voucherCode]` — driver assignment form + save
  - `GET /api/cron/reminders` — Vercel Cron target
- **Vercel KV** for booking persistence (auto-detected via `KV_REST_API_URL` env)
- **Vercel Cron** hourly hits `/api/cron/reminders` (see `vercel.json`)
- Local dev: `node server.js` uses same handlers with file-based storage fallback

## Tech Stack
- Pure HTML + Vanilla JS + Plain CSS + Tailwind CDN
- Google Fonts (Fraunces + Manrope), Leaflet, Material Symbols
- Node.js 20 + Nodemailer + @vercel/kv + Express (dev only)

## Brand Palette (from logo)
- Red `#E31E24` / Deep `#B8171C` / Gold `#D4A24A` / Cream `#FBF7F0` / Charcoal `#141414`

## Implemented (2026-01)
- Landing page with hero (Fraunces serif), booking widget (live Leaflet map, route pricing, currency switcher), services, fleet (6 vehicles), destinations bento, testimonials, FAQ, mobile bottom bar
- Route-based pricing: base + per-km × Haversine × 1.25 road factor, min-fare floor, return × 1.85, hourly × hours
- SMTP: guest confirmation, admin alert (with Assign Driver CTA), 12h reminder — all branded HTML templates + text fallbacks + human date format
- Driver assignment page (no login, voucher-code URL is the token)
- Reminder cron: idempotent (marks `reminderSentAt`), scans within 12h window
- Storage abstraction: Vercel KV auto-switch when env present, file fallback otherwise

## Files
- `/app/index.html`, `/app/src/main.js`, `/app/src/styles.css`, `/app/stb-logo.png`
- `/app/emails/templates.js`
- `/app/lib/store.js` — KV/file dual-mode storage
- `/app/lib/handlers.js` — shared handlers (booking, assign, cron)
- `/app/api/bookings.js`, `/app/api/assign/[voucherCode].js`, `/app/api/cron/reminders.js`
- `/app/server.js` — local dev wrapper
- `/app/vercel.json`, `/app/README-DEPLOY.md`
- `/app/.env` — SMTP + brand + admin config

## Testing
- 19/19 backend tests passed (see `/app/backend/tests/backend_test.py`)
- Live Gmail SMTP verified end-to-end (guest, admin, and 12h reminder emails all deliver)
- Booking persistence + assignment + reminder idempotency all confirmed

## Deployment
See `README-DEPLOY.md` for step-by-step Vercel setup (GitHub → Vercel import → Create KV → Add env vars → Redeploy).

## Backlog / P1
- Post-ride review-request email
- Voucher auto-cancel if pickup passes without driver assigned
- Duplicate-booking guard (same email in 30 min)

## Backlog / P2
- Multi-language toggle (EN / ZH / MS)
- Sticky WhatsApp FAB on desktop
- SMS reminders via Twilio
