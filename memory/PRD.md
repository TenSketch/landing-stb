# STB Singapore — Product Requirements Document

## Original Problem Statement
Rebuild the landing page as a pure HTML + CSS + Vanilla JS site (no React) for SEO. Use the uploaded STB logo, extract brand palette from it, add serif display font on hero, fix all mismatched vehicle/destination images, and add a 4-item mobile bottom bar. Legal modals not needed.

## Tech Stack
- Pure HTML (index.html) + Vanilla JS (src/main.js) + Plain CSS (src/styles.css)
- Tailwind CSS via CDN
- Google Fonts: Fraunces (serif display) + Manrope (body)
- Leaflet for map, Material Symbols for icons
- Express server (server.js) for static hosting + `/api/bookings` endpoint

## Brand Palette (extracted from logo)
- Primary Red: `#E31E24` / Deep Red: `#B8171C`
- Gold: `#D4A24A` / Deep Gold: `#B08536`
- Cream: `#FBF7F0` / Charcoal: `#141414`

## Implemented (2026-01)
- Real STB logo integrated (`/public/stb-logo.png`) — header, footer, favicon, meta
- Fraunces serif display font on all H1/H2 headlines with italic red accents
- Hero: 3-col stats row (10+ years, 42k rides, 4.9★), trust badges, booking widget
- Booking widget: trip mode tabs, service select, live Leaflet map, autocomplete presets, vehicle chips, currency selector (7 currencies)
- Services (4 cards): consistent card layouts with icon, tag, price, book CTA
- Fleet (6 vehicles): filterable by category, real Unsplash photos, specs modal
- Destinations (bento grid): 4 cards with real Singapore landmark photos (MBS, Gardens by Bay, Sentosa, Jewel Changi)
- How to Book (4-step timeline)
- Testimonials (horizontal scroll)
- FAQ (searchable + category filter, accordion)
- Final CTA (dark gradient section)
- Footer with contact info and social links
- **Mobile bottom bar (4 items)**: Home, Fleet, Book (primary red), WhatsApp
- Modals: Vehicle Specs, Booking Confirmation, WhatsApp Dispatch, Share Review
- SEO: LimoService + FAQ JSON-LD schema, OG meta, Twitter cards, canonical
- Currency conversion working across all price displays
- Reveal-on-scroll animations
- Server: `/api/bookings` POST endpoint (in-memory store, email payload logging)

## Files
- `/app/index.html` — main landing page
- `/app/src/main.js` — vanilla JS interactions
- `/app/src/styles.css` — custom brand stylesheet
- `/app/public/stb-logo.png` — official STB logo
- `/app/server.js` — Express server (port 3000)

## Backlog / P1
- Real vehicle model photos (Alphard, HiAce specifically — currently generic luxury cars)
- Wire booking form to real email service (SendGrid/Resend) via `/api/bookings`
- Google/OpenStreetMap route distance calculation for dynamic pricing
- Actual privacy policy + terms of service pages (deferred by user)
- Migrate Tailwind CDN to local build for production (removes console warning)

## Backlog / P2
- Multi-language toggle (EN/ZH/MS/ID)
- Booking history for returning customers (localStorage)
- Real-time flight tracking widget integration
- Live chat handoff from WhatsApp modal
