# STB Singapore — Product Requirements Document

## Original Problem Statement
Rebuild landing page as pure HTML + CSS + Vanilla JS (no React) for SEO. Extract brand palette from uploaded logo. Add SMTP for guest + admin booking emails. Add route-based distance pricing and guest reminder emails 12 hours before pickup. Keep it a simple landing page — no admin dashboard.

## Tech Stack
- Pure HTML (`index.html`) + Vanilla JS (`src/main.js`) + Plain CSS (`src/styles.css`)
- Tailwind CSS via CDN, Google Fonts (Fraunces + Manrope)
- Leaflet map, Material Symbols icons
- Express (`server.js`), Nodemailer + Gmail SMTP, `node-cron`-style setInterval for reminders
- File-based persistence: `/app/data/bookings.json`

## Brand Palette (from logo)
- Red `#E31E24` / Deep `#B8171C` / Soft `#FDECEC`
- Gold `#D4A24A` / Deep `#B08536` / Soft `#FBF3E1`
- Cream `#FBF7F0` / Charcoal `#141414`

## Implemented (2026-01-05)
### Landing page
- STB logo everywhere, Fraunces serif hero, minimal mobile bottom bar (4 items)
- Booking widget with trip modes, live Leaflet map, autocomplete, currency selector (7)
- Services / Fleet / Destinations / How-to-Book / Testimonials / FAQ / Final CTA
- Real Singapore landmark photos on destinations
- Modals: Vehicle Specs, Booking Confirmation, WhatsApp, Review

### Route-based pricing (NEW)
- Each vehicle has `baseFareSGD` + `perKmSGD` + `minFareSGD`
- Haversine distance × 1.25 road factor
- Live route summary strip below map: `21.4 km · ~32 min drive · S$98`
- Vehicle chips update prices live as pickup/destination change
- Return trips × 1.85 multiplier; Hourly falls back to `hourlySGD × hours`
- Fallback to `minFareSGD` for freeform (non-preset) addresses

### Email dispatch
- Gmail SMTP (`smtp.gmail.com:587`) with app password
- On booking POST: guest confirmation + admin alert (parallel)
- Guest: VIP-Pass card, booking summary, WhatsApp CTA, "what happens next"
- Admin: 2-col passenger + trip blocks, dark fare strip, **"Assign Driver" primary CTA** + WhatsApp / Email quick actions + dispatch checklist
- Human-readable date formatting: `6 Aug 2026, 2:14 AM`

### Driver assignment (NEW)
- `GET /assign/:voucherCode` — branded form (no login, voucher acts as auth token)
- `POST /assign/:voucherCode` — saves driverName / driverPhone / driverPlate / driverPhotoUrl
- Idempotent: admin can re-open and edit anytime before pickup

### 12-hour reminder email (NEW)
- setInterval(60s) scans `bookings.json` for pickups within 12h and `reminderSentAt == null`
- Sends branded reminder email; marks `reminderSentAt` to prevent duplicates
- **If driver assigned**: dark chauffeur card with photo, name, phone, gold plate badge
- **If not assigned**: friendly "driver details incoming via WhatsApp" placeholder

## Files
- `/app/index.html`, `/app/src/main.js`, `/app/src/styles.css`, `/app/public/stb-logo.png`
- `/app/emails/templates.js` — guestEmail, adminEmail, reminderEmail (+ text fallbacks)
- `/app/server.js` — Express + SMTP + cron + assign endpoint
- `/app/data/bookings.json` — persisted bookings
- `/app/.env` — SMTP + brand + admin config

## Backlog / P1
- Real fleet vehicle photos (user managing locally)
- Migrate Tailwind CDN → local build for production

## Backlog / P2
- Multi-language toggle (EN / ZH / MS)
- Sticky WhatsApp FAB on desktop
- SMS reminders via Twilio
