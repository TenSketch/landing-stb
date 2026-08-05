# STB Singapore — Product Requirements Document

## Original Problem Statement
Rebuild the landing page as pure HTML + CSS + Vanilla JS (no React) for SEO. Use uploaded STB logo, extract brand palette, add serif display font on hero, fix vehicle/destination images, add 4-item mobile bottom bar. Then: wire SMTP for guest + admin booking emails using provided Gmail credentials.

## Tech Stack
- Pure HTML (`index.html`) + Vanilla JS (`src/main.js`) + Plain CSS (`src/styles.css`)
- Tailwind CSS via CDN, Google Fonts (Fraunces + Manrope)
- Leaflet for map, Material Symbols for icons
- Express (`server.js`) — static hosting + `/api/bookings`
- Nodemailer + Gmail SMTP for booking emails
- Env config in `/app/.env`

## Brand Palette (from logo)
- Red `#E31E24` / Deep `#B8171C` / Soft `#FDECEC`
- Gold `#D4A24A` / Deep `#B08536` / Soft `#FBF3E1`
- Cream `#FBF7F0` / Charcoal `#141414`

## Implemented
### Landing page (2026-01-05)
- STB logo integrated (header, footer, favicon, meta, email header)
- Fraunces serif hero with italic red accents + gold underline swash
- Hero with 3-col stats (10+ years, 42k rides, 4.9★) + trust badges
- Booking widget: trip modes, service select, Leaflet map, autocomplete, vehicle chips, currency selector (7 currencies)
- Services (4 cards), Fleet (6 vehicles, filterable), Destinations bento (real SG landmark photos)
- How-to-Book timeline, Testimonials, FAQ (search + category filter)
- Final CTA (single Book button; WhatsApp button removed per user request)
- Minimal mobile bottom bar: Home / Fleet / Book (subtle red text + top-line indicator) / WhatsApp
- Modals: Vehicle Specs, Booking Confirmation, WhatsApp Dispatch, Share Review
- SEO: LimoService + FAQ JSON-LD, OG meta, Twitter cards

### Email dispatch (2026-01-05)
- Gmail SMTP via `smtp.gmail.com:587` with app password
- On booking POST: sends guest confirmation + admin alert in parallel
- Guest email: VIP Pass card with voucher, booking summary, WhatsApp CTA, 3-step "what happens next", change-request info
- Admin email: booking alert with 2-col Passenger + Trip blocks, dark Fare + Payment strip, WhatsApp Customer / Email Customer quick actions, dispatch checklist
- Both templates: table-based layout, brand logo, mobile-responsive, plain-text fallback
- From: `admin@singaporetourbooking.com` (via `EMAIL_FROM`), auth: `tensketch285@gmail.com`
- Admin recipient: `admin@singaporetourbooking.com` (via `ADMIN_NOTIFICATION_EMAIL`)

## Files
- `/app/index.html` — landing page
- `/app/src/main.js` — vanilla JS
- `/app/src/styles.css` — brand stylesheet
- `/app/emails/templates.js` — HTML/text email templates (ESM)
- `/app/server.js` — Express + nodemailer
- `/app/.env` — SMTP + brand + admin config
- `/app/public/stb-logo.png` — official logo

## Backlog / P1
- Real fleet vehicle photos (user will manage locally)
- Route-based distance pricing using pickup/destination coords
- Migrate Tailwind CDN → local build for production

## Backlog / P2
- Multi-language toggle (EN / ZH / MS / ID)
- Booking history in localStorage
- Real-time flight tracking widget
- Sticky WhatsApp FAB on desktop
