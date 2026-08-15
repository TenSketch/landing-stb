# STB Singapore — Vercel Deployment Guide

Static landing page + minimal serverless API. Works on Vercel's **free Hobby plan** — no cron, no paid extras.

---

## Architecture on Vercel

- **Static files** (`index.html`, `/src/*`, `/stb-logo.png`) served from Vercel's global CDN → perfect SEO.
- **Serverless API** in `/api/*`:
  - `POST /api/bookings` — creates a booking, sends guest confirmation + admin alert emails.
  - `GET /assign/:voucherCode` — driver assignment form.
  - `POST /assign/:voucherCode` — saves driver details **and immediately emails the guest** with the chauffeur's name / plate / photo. No cron needed.
- **Vercel KV** (Redis, free tier) for booking persistence.

---

## One-Time Setup

### 1. Push code to GitHub
Use the "**Save to Github**" button in Emergent's chat toolbar.

### 2. Import on Vercel
- Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → pick the repo
- Framework Preset: **Other** (Vercel auto-detects `vercel.json`)
- Root Directory: `./`
- Build / Output: leave blank
- Click **Deploy** — first deploy will complete but emails won't send yet (env vars still missing).

### 3. Create Vercel KV
- In your project dashboard: **Storage → Create Database → KV (Redis)**
- Name: `stb-bookings`, Region: closest to Singapore (Tokyo `hnd1` if `sin1` unavailable)
- Click **Connect Project** → Vercel auto-injects `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`.

### 4. Add environment variables
**Settings → Environment Variables** — paste these (from `/app/.env`):

| Key | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `tensketch285@gmail.com` |
| `SMTP_PASSWORD` | `mnztrzpifmohrrxa` |
| `EMAIL_FROM` | `admin@singaporetourbooking.com` |
| `ADMIN_NOTIFICATION_EMAIL` | `admin@singaporetourbooking.com` |
| `NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER` | `+919840167444` |
| `LOGO_URL` | `https://YOUR-PROJECT.vercel.app/stb-logo.png` (fill in after first deploy) |
| `BRAND_NAME` | `STB Singapore` |
| `BRAND_TAGLINE` | `Majestic Hospitality Since 2014` |
| `CONTACT_PHONE` | `+91 9840 167 444` |
| `CONTACT_EMAIL` | `admin@singaporetourbooking.com` |
| `SITE_URL` | your Vercel domain (or custom domain later) |
| `GOOGLE_MAPS_API_KEY` | `AIzaSyDQJGrgguIXGWqQy3bpwGi6wXdOlGXqxSw` (or your preferred production key) |

Apply to **Production**, **Preview**, and **Development**.

> [!IMPORTANT]
> **Google Cloud API Key Setup**:
> For the Google Places API to search correctly after deployment:
> 1. Ensure the **Places API** and **Maps JavaScript API** are enabled in your Google Cloud Project.
> 2. Set **HTTP Referrer Restrictions** on the API Key in the Google Cloud Console to allow your deployed Vercel URL (e.g., `https://*.vercel.app/*` and your custom domain `https://*.singaporetourbooking.com/*`). Otherwise, Google will reject search queries from the live site with a `RefererNotAllowedMapError`.

### 5. Redeploy
**Deployments → ⋮ → Redeploy**. Wait ~30 seconds — site live at `https://YOUR-PROJECT.vercel.app`.

### 6. Update `LOGO_URL`
After first deploy succeeds, update `LOGO_URL` to `https://YOUR-PROJECT.vercel.app/stb-logo.png` and redeploy so emails use the correct absolute logo URL.

### 7. (Optional) Custom domain
**Settings → Domains → Add** → point your DNS to Vercel. Update `SITE_URL` env and redeploy.

---

## How It Works

1. **Guest fills booking form on landing page** → `POST /api/bookings` → creates booking in KV → sends **2 emails immediately**:
   - Guest confirmation (VIP-Pass style)
   - Admin alert (with "Assign Driver" button link)
2. **You click "Assign Driver"** in the admin email → tiny form at `/assign/STB-2026-XXXX` → fill chauffeur name / plate / phone / photo URL → click Save.
3. **Guest gets the chauffeur email instantly** — driver photo, name, plate, WhatsApp button, pickup countdown ("Pickup in ~11 hours").

No cron, no scheduling, no infrastructure. Everything happens at the moment of the action.

---

## Verifying Production

- `https://YOUR-PROJECT.vercel.app/` — landing page loads
- Submit a real booking → check inbox for guest + admin emails
- Click "Assign Driver" in admin email → fill form → guest gets the chauffeur email within seconds

---

## Cost estimate

| Item | Free tier | Cost after |
|---|---|---|
| Vercel Hobby | Unlimited static + 100 GB bandwidth + 100k serverless invocations/mo | $0 |
| Vercel KV | 30k requests/mo, 256 MB | $0 |
| Gmail SMTP | 500 emails/day | $0 |

**Total: $0/month** for a typical landing-page use case.

---

## Local Development

`node server.js` still works — uses local JSON file storage (`data/bookings.json`) and the same handlers. On Vercel, KV auto-activates when `KV_REST_API_URL` env is present.
