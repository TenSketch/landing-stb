// Local dev server — wraps the same handlers used by Vercel /api/* functions.
// Not used in production. On Vercel, /api/* files are serverless functions.
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import {
  handleCreateBooking, handleGetAssign, handlePostAssign,
  getTransporter,
} from "./lib/handlers.js";
import { storageMode } from "./lib/store.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy artifact hero background image to public/hero-bg.jpg if present
try {
  const artifactHero = "C:/Users/bala/.gemini/antigravity-ide/brain/3661ce98-69fa-4a86-be25-4857e224ab50/media__1786610258174.jpg";
  const targetHero = path.join(__dirname, "public", "hero-bg.jpg");
  if (fs.existsSync(artifactHero)) {
    fs.copyFileSync(artifactHero, targetHero);
    console.log("[HERO-BG] Copied luxury Mercedes skyline image to public/hero-bg.jpg");
  }
} catch (err) {
  console.warn("[HERO-BG] Copy fallback skipped:", err.message);
}

const app = express();
const PORT = process.env.PORT || 3003;

// ─── Security Headers (CSP + HSTS + Frame Options + Content Type + XSS + Referrer + Permissions) ───
app.use((req, res, next) => {
  const nonce = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  res.locals.nonce = nonce;

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.tailwindcss.com https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.google-analytics.com https://*.googletagmanager.com https://nominatim.openstreetmap.org https://unpkg.com",
      "frame-src 'self' https://www.googletagmanager.com",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.removeHeader("X-Powered-By");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets — mirror how Vercel serves them (from /public folder at root URL)
app.use(express.static(path.join(__dirname, "public"), { index: false, extensions: ["html"] }));

// ---------- Warm SMTP + log ----------
const transporter = getTransporter();
if (transporter) {
  transporter.verify((err) => {
    if (err) console.error("[SMTP] verify failed:", err.message);
    else console.log("[SMTP] ready to send via", process.env.SMTP_HOST);
  });
} else {
  console.warn("[SMTP] not configured — bookings will log to console only.");
}
console.log("[STORAGE]", storageMode);

// ---------- Health ----------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "STB Singapore",
    smtp: Boolean(transporter),
    storage: storageMode,
    node: process.version,
  });
});

// ---------- Bookings ----------
app.post("/api/bookings", async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const r = await handleCreateBooking(req.body || {}, baseUrl);
  res.status(r.status).json(r.body);
});

// ---------- Assign (GET form, POST save) ----------
app.get("/assign", (_req, res) => {
  res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><title>STB Assign</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:auto;color:#141414;background:#FBF7F0;}</style></head>
    <body><h1>STB Dispatch</h1><p>Open your booking-alert email and click <strong>Assign Driver</strong> — the link includes the voucher code.</p></body></html>`);
});

app.get("/assign/:voucherCode", async (req, res) => {
  const r = await handleGetAssign(req.params.voucherCode);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(r.status).send(r.html);
});

app.post("/assign/:voucherCode", async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const r = await handlePostAssign(req.params.voucherCode, req.body || {}, baseUrl);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(r.status).send(r.html);
});

// ---------- SPA-ish fallback ----------
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`STB Singapore local dev server on http://localhost:${PORT}`);
});
