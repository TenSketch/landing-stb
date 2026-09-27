# Deployment

> Verified against `deploy/nginx.conf`, `README-DEPLOY.md`, `package.json` as of commit `15e4184`.

## Current Architecture

Single Node.js process on a Hetzner VPS:
- Port 3003
- Nginx reverse-proxies subdomains
- PostgreSQL database
- No pm2/cluster — single process

## Prerequisites

1. **Node.js** 20+ with ES modules support
2. **PostgreSQL** 14+
3. **Nginx** (or compatible web server)
4. **DNS** entries for subdomains pointing to VPS IP

## Environment Variables

See `.env.example` for full list. Critical variables:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/stb
STB_SECRET_KEY=<32-char-hex-string>

# Subdomain routing
ROOT_DOMAIN=singaporetourbooking.com
ADMIN_HOST=admin.singaporetourbooking.com
API_HOST=api.singaporetourbooking.com
COOKIE_DOMAIN=singaporetourbooking.com

# Bootstrap
INITIAL_ADMIN_EMAIL=admin@singaporetourbooking.com

# External APIs
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
GOOGLE_SERVER_API_KEY=AIza...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=app-password
```

## Installation Steps

```bash
# 1. Clone and install
git clone https://github.com/TenSketch/landing-stb.git
cd landing-stb
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with real values

# 3. Run migrations
npm run db:migrate

# 4. Start server
npm run dev
```

## Nginx Configuration

Drop `deploy/nginx.conf` into your nginx config:

```bash
# For Ubuntu/Debian:
sudo cp deploy/nginx.conf /etc/nginx/sites-available/stb
sudo ln -s /etc/nginx/sites-available/stb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

The nginx config creates three virtual hosts:
- `admin.singaporetourbooking.com` → port 3003 (admin SPA)
- `api.singaporetourbooking.com` → port 3003 (API)
- `singaporetourbooking.com` (default) → port 3003 (landing)

HTTPS is terminated at Nginx (let's encrypt recommended):
```bash
sudo certbot --nginx -d singaporetourbooking.com -d admin.singaporetourbooking.com -d api.singaporetourbooking.com
```

## Local Development

No nginx required — Express uses `vhost` middleware for hostname-based routing on `localhost:3003`:

```
http://admin.localhost:3003   → Admin SPA
http://api.localhost:3003     → API
http://localhost:3003          → Landing
```

Add to `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
127.0.0.1 admin.localhost
127.0.0.1 api.localhost
```

## Process Management

Currently no pm2 or systemd unit file. For production:
```bash
# Option 1: pm2
npm install -g pm2
pm2 start server.js --name stb
pm2 save
pm2 startup

# Option 2: systemd
# Create /etc/systemd/system/stb.service
```

## Production Checklist

- [ ] `STB_SECRET_KEY` set to random 32-byte hex value
- [ ] PostgreSQL SSL configured (`PG_SSL=true`)
- [ ] `NODE_ENV=production`
- [ ] HTTPS on all subdomains
- [ ] Google Maps API key restricted to domain
- [ ] SMTP credentials configured
- [ ] Rate limiting enabled (in-memory; Redis for multi-node)
- [ ] Nginx security headers enabled
- [ ] Backups configured for PostgreSQL
- [ ] Log rotation configured
