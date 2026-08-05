# STB Singapore — Vercel Deployment Guide

This app is designed to deploy to **Vercel** as a static site + serverless API. Zero backend server needed.

---

## What Vercel Gets

- **Static files** (`index.html`, `/src/*`, `/stb-logo.png`) served from Vercel's global CDN — perfect for SEO.
- **Serverless API** in `/api/*`:
  - `POST /api/bookings` — receives booking, sends guest + admin emails
  - `GET /assign/:voucherCode` — driver assignment form (via rewrite)
  - `POST /assign/:voucherCode` — saves driver details
  - `GET /api/cron/reminders` — called by Vercel Cron every 10 minutes to fire due 12h reminders
- **Vercel KV** (Redis) — persistent storage for bookings.
- **Vercel Cron** — schedules the reminder scan.

---

## One-Time Setup

### 1. Push code to GitHub

Use Emergent's **"Save to GitHub"** button in the chat toolbar, or push manually. Vercel imports from a GitHub repo.

### 2. Import project on Vercel

- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repo
- **Framework preset:** *Other* (Vercel auto-detects `vercel.json`)
- **Root directory:** `./`
- **Build command:** leave blank
- **Output directory:** leave blank
- Click **Deploy** (will fail on first try — that's OK, we need KV + env vars)

### 3. Create a Vercel KV database

- In your project's Vercel dashboard: **Storage → Create Database → KV (Redis)**
- Name: `stb-bookings`
- Region: pick nearest to Singapore (e.g. `sin1` if available, or `hnd1` Tokyo)
- Click **Connect** to link it to this project → Vercel auto-injects `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL` environment variables.

### 4. Add environment variables

**Settings → Environment Variables** — copy these from your local `.env`:

| Key | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `tensketch285@gmail.com` |
| `SMTP_PASSWORD` | `mnztrzpifmohrrxa` |
| `EMAIL_FROM` | `admin@singaporetourbooking.com` |
| `ADMIN_NOTIFICATION_EMAIL` | `admin@singaporetourbooking.com` |
| `NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER` | `+919840167444` |
| `LOGO_URL` | `https://YOUR-VERCEL-DOMAIN.vercel.app/stb-logo.png` (fill in after first deploy) |
| `BRAND_NAME` | `STB Singapore` |
| `BRAND_TAGLINE` | `Majestic Hospitality Since 2014` |
| `CONTACT_PHONE` | `+91 9840 167 444` |
| `CONTACT_EMAIL` | `admin@singaporetourbooking.com` |
| `SITE_URL` | your Vercel domain (or custom domain) |
| `CRON_SECRET` | *any long random string* — Vercel Cron includes this as a Bearer token for the `/api/cron/reminders` endpoint |

Apply to **all environments** (Production + Preview + Development).

### 5. Redeploy

- **Deployments → ⋮ → Redeploy** on the latest deployment.
- Wait ~30 seconds. Site should be live at `https://your-project.vercel.app`.

### 6. Update LOGO_URL

After first successful deploy, update `LOGO_URL` to `https://your-project.vercel.app/stb-logo.png` and redeploy so the emails use your production logo URL.

### 7. (Optional) Custom domain

- **Settings → Domains → Add** → point your DNS at Vercel.
- Update `SITE_URL` to the custom domain and redeploy.

---

## Verifying Production

Once deployed:

- Visit `https://your-domain.vercel.app/` — landing page loads.
- Visit `https://your-domain.vercel.app/api/cron/reminders` — should return `401 Unauthorized` (that's correct — proves `CRON_SECRET` is set).
- Submit a real booking → check inbox for guest + admin email.
- Click the "Assign Driver" button in the admin email → fill form → reminder email fires 12h before pickup.

Vercel Cron logs are visible in **Project → Deployments → Functions**.

---

## Local Development

`node server.js` still works — it uses local file storage (`data/bookings.json`) and a `setInterval` cron. On Vercel, both are replaced by Vercel KV + Vercel Cron automatically (based on presence of `KV_REST_API_URL`).

---

## Cost estimate (personal / small-business)

| Item | Free tier | Cost after |
|---|---|---|
| Vercel hosting | Unlimited static + 100 GB bandwidth | $0 |
| Vercel Serverless invocations | 100k/month | $0 |
| Vercel KV | 30k requests/month, 256 MB | $0 |
| Vercel Cron | 2 jobs, 1 execution/hour on Hobby | $0 (we run every 10 min — this is on Pro; on Hobby it caps to hourly) |
| Gmail SMTP | 500 emails/day | $0 |

For higher cron frequency on Hobby, either set schedule to `0 * * * *` (hourly) in `vercel.json` or upgrade to Pro ($20/mo).
