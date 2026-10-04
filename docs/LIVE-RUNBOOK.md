# STB Live Runbook

## Topology
| Piece | Value |
|---|---|
| Repo | https://github.com/TenSketch/landing-stb (branch `main`) |
| VPS path | `/root/landing-stb` (root-owned; run as `sudo`) |
| App | pm2 `stb-server` → `127.0.0.1:3003` (start WITH `--cwd /root/landing-stb` or dotenv loads nothing) |
| Webhook deployer | pm2 `stb-webhook` → :9003 (`/webhook`, HMAC `x-hub-signature-256`, fail-closed) |
| Node | `/root/.nvm/versions/node/v24.19.0/bin/node` (plain `node` not on PATH for sudo) |
| DB | PostgreSQL 18 on **:5433** (not 5432), DB `stb_dev`, superuser shell: `sudo -u postgres psql -p 5433 -d stb_dev` |
| Domains | `singaporetourbooking.com` / `admin.*` / `api.*` → 167.233.254.201, certs via certbot |
| SMTP | `smtp.zoho.in:587` STARTTLS, user+from `info@singaporetourbooking.com` (**465 is egress-blocked on this VPS — never switch back**) |

## Health checks (run after any deploy)
```bash
curl -s https://api.singaporetourbooking.com/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://singaporetourbooking.com/
sudo pm2 logs stb-server --lines 30 --nostream   # look for '[SMTP] ready to send via smtp.zoho.in'
```

## Test suites
```bash
# full e2e (90 checks; needs localhost:3003 running)
sudo /root/.nvm/versions/node/v24.19.0/bin/node tests/e2e-suite.cjs
# extended security/ops audit (69 probes)
sudo /root/.nvm/versions/node/v24.19.0/bin/node tests/audit.cjs
```
Expected: e2e **89/90** until `GOOGLE_MAPS_API_KEY` is set, audit **69/69**.
Gate before ANY test that triggers bookings/OTP/emails: check `.env` mail routing — sends must stay on `info@singaporetourbooking.com` (project's own mailbox). Test rows are labelled `E2E-TEST`/`safe to delete` and purged by the suite.

## Deploy flow
1. Push to `main` on GitHub (or let the signed webhook deploy).
2. Webhook runs `git fetch && reset --hard origin/main` — **only signed requests** (`x-hub-signature-256`).
3. If you changed deps: `sudo npm install --prefix /root/landing-stb`.
4. `sudo pm2 restart stb-server` then run the health checks + suites above.
5. Never commit `.env` or the secret-bearing runtime files (`.gitignore` enforces: `ecosystem.config.cjs`, `stb-webhook-start.sh`, `webhook-server.js`, `.env*`).

## Config notes (hard-won, do not "clean up" blindly)
- **`NODE_ENV` stays unset.** Cookies are secured explicitly (`secure: true`); flipping NODE_ENV would silently change `cookie.domain`/`secure` semantics app-wide.
- Security headers (CSP/HSTS/XFO) are emitted by **server.js middleware** — never add them at the nginx layer (duplicate CSPs intersect and can block CDNs the app allows).
- nginx `root /var/www/landing-stb` does not exist; all traffic intentionally falls through to the Node app.
- Google SMTP for this project is dead on purpose (Zoho is the mail provider; SPF only includes `zoho.in`).
- Outbound port **465 is blocked** by the provider network (gmail/zoho/o365 all fail, 587 all pass). STARTTLS-587 is the permanent answer.

## Incident: secret exposed in chat
If a secret passes through chat (e.g. `WEBHOOK_SECRET` from `stb-webhook-start.sh`), treat it as compromised: rotate it (update `.env`, GitHub webhook secret, pm2 restart) and note it in the QA report.
