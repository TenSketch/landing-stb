// STB Singapore — Persistent Express Server with Dynamic PostgreSQL Pricing Engine
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import cookieParser from "cookie-parser";


import {
  handleCreateBooking, handleGetAssign, handlePostAssign,
  getTransporter, handleEstimateFare,
} from "./lib/handlers.js";
import { storageMode } from "./lib/store.js";
import { testConnection, query } from "./lib/db.js";
import { requireAdminAuth } from "./lib/auth.js";
import apiRouter from "./lib/api.js";
import { optionalCustomerAuth } from "./lib/customerAuth.js";
import { getPublicBrandConfig, getBookingConfig, getContentConfig, getCurrencyConfig } from "./lib/settings.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "singaporetourbooking.com";
const ADMIN_HOST = process.env.ADMIN_HOST || `admin.${ROOT_DOMAIN}`;
const API_HOST = process.env.API_HOST || `api.${ROOT_DOMAIN}`;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ROOT_DOMAIN;
const isProd = process.env.NODE_ENV === "production";

const app = express();
const PORT = process.env.PORT || 3003;

// Trust the first proxy hop (nginx/caddy) so req.secure / X-Forwarded-Proto work
app.set("trust proxy", 1);

// ─── Security Headers ───
app.use((req, res, next) => {
  const nonce = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  res.locals.nonce = nonce;

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.tailwindcss.com https://unpkg.com https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "img-src 'self' data: https: blob: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
      "font-src 'self' https://fonts.gstatic.com https://unpkg.com",
      `connect-src 'self' https://${API_HOST} http://${API_HOST} https://*.google-analytics.com https://*.googletagmanager.com https://nominatim.openstreetmap.org https://unpkg.com https://maps.googleapis.com https://places.googleapis.com https://*.googleapis.com`,
      "frame-src 'self' https://www.googletagmanager.com https://maps.google.com https://www.google.com",
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
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.removeHeader("X-Powered-By");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── CORS for admin.* → api.* (both production https and dev http://*.localhost) ───
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  // Build allowed origins dynamically for the configured hosts
  const allowed = new Set([
    `https://${ADMIN_HOST}`,
    `https://${API_HOST}`,
    `https://${ROOT_DOMAIN}`,
    `https://www.${ROOT_DOMAIN}`,
    // Local-dev over plain HTTP
    `http://${ADMIN_HOST}`,
    `http://${API_HOST}`,
    `http://${ROOT_DOMAIN}`
  ]);
  if (allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Static assets — must run BEFORE the host router so /admin/admin.css is served as a file,
// not intercepted as an SPA route.
app.use(express.static(path.join(__dirname, "public"), { index: false, extensions: ["html"] }));

// ─── Host-based routing ───
// admin.*  → admin SPA only (no /api here, so admin API on api.* must be used)
// api.*    → /api/* endpoints only
// *        → main landing page
app.use((req, res, next) => {
  const host = (req.headers.host || "").toLowerCase().split(":")[0];
  if (host === ADMIN_HOST) {
    // Serve SPA for bare host, /admin, /admin/* — anything else (/api/*, assets) falls through
    if (req.path === "/" || req.path === "/index.html" ||
        req.path === "/admin" || req.path === "/admin/" ||
        req.path.startsWith("/admin/?")) {
      return res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
    }
    if (req.path.startsWith("/admin/") && !req.path.includes(".")) {
      return res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
    }
    return next();
  }
  if (host === API_HOST) {
    if (!req.path.startsWith("/api/")) return res.status(404).send("Not Found");
    return next();
  }
  next();
});

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

// Check DB connectivity
testConnection().then((dbStatus) => {
  if (dbStatus.ok) {
    console.log("[POSTGRESQL] Connected successfully to database at", dbStatus.time);
  } else {
    console.warn("[POSTGRESQL] Database connection not ready:", dbStatus.error);
  }
});

// ---------- Config (public) ----------
app.get("/api/config", async (_req, res) => {
  try {
    res.json({
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      brand: await getPublicBrandConfig(),
      booking: await getBookingConfig(),
      content: await getContentConfig(),
      currency: await getCurrencyConfig()
    });
  } catch (err) {
    console.warn("[Config] failed to load dynamic config:", err.message);
    res.json({
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      brand: {
        name: process.env.BRAND_NAME || "STB Singapore",
        tagline: process.env.BRAND_TAGLINE || "Majestic Hospitality Since 2014",
        phone: process.env.CONTACT_PHONE || "+65 9062 9107",
        whatsapp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "+659****9107"
      },
      content: {}
    });
  }
});

// ---------- Public vehicles catalog (admin-editable) ----------
app.get("/api/vehicles", async (_req, res) => {
  try {
    const result = await query(`
      SELECT id, slug, name, full_name, description, category, tag, tag_style,
             pax, pax_max, luggage, base_fare_sgd, per_km_sgd, min_fare_sgd, hourly_sgd,
             image_url, fallback_image_url, description_html, features_json, display_order
      FROM vehicle_types
      WHERE is_active = TRUE
      ORDER BY display_order ASC, id ASC
    `);
    res.json({ success: true, vehicles: result.rows });
  } catch (err) {
    console.error("[Vehicles API] error:", err.message);
    res.status(500).json({ error: "Failed to load vehicles.", detail: err.message });
  }
});

// ---------- Public editable content blocks (FAQ / hero / services / footer) ----------
app.get("/api/content", async (_req, res) => {
  try {
    const { category } = _req.query;
    const params = [];
    let where = "is_active = TRUE";
    if (category) {
      params.push(category);
      where += " AND category = $1";
    }
    const result = await query(
      `SELECT id, block_key, category, title, body, icon, image_url, meta_json, sort_order
       FROM content_blocks WHERE ${where} ORDER BY sort_order ASC, id ASC`,
      params
    );
    res.json({ success: true, blocks: result.rows });
  } catch (err) {
    console.error("[Content API] error:", err.message);
    res.status(500).json({ error: "Failed to load content.", detail: err.message });
  }
});

// Mount new admin/customer API routes (these handle /api/admin/* and /api/*)
app.use("/api", apiRouter);

// ---------- Customer Bookings (Authoritative Server Validation) ----------
app.post("/api/bookings", optionalCustomerAuth, async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const payload = req.body || {};
  // Link logged-in customer if present and no customer_id provided
  if (req.customer && !payload.customerId) {
    payload.customerId = req.customer.id;
  }
  const r = await handleCreateBooking(payload, baseUrl);
  res.status(r.status).json(r.body);
});

// ---------- Health ----------
app.get("/api/health", async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: "ok",
    service: "STB Singapore",
    smtp: Boolean(transporter),
    database: dbStatus.ok ? "connected" : "disconnected",
    storage: storageMode,
    node: process.version,
  });
});

// ---------- Customer Fare Estimation ----------
app.post("/api/estimate", async (req, res) => {
  const referer = req.headers.referer || "https://singaporetourbooking.com/";
  const r = await handleEstimateFare(req.body || {}, referer);
  res.status(r.status).json(r.body);
});

// Admin auth and all admin/customer API routes are handled by lib/api.js (mounted at /api below).
// Note: prior duplicate /api/admin/pricing* and /api/admin/audit handlers were removed —
// they were unreachable because the apiRouter (mounted at /api) shadowed them.

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

app.post(["/assign/:voucherCode", "/api/assign/:voucherCode"], async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const r = await handlePostAssign(req.params.voucherCode, req.body || {}, baseUrl);
  if (req.path.startsWith("/api/")) {
    return res.status(r.status).json(r);
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(r.status).send(r.html);
});

// ---------- Admin App Route ----------
app.get("/admin/reset-password", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "reset-password.html"));
});
app.get(["/admin", "/admin/*"], (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

// ---------- Unknown /api routes: JSON 404 (never fall through to the SPA HTML) ----------
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------- SPA-ish fallback ----------
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Global error handler (never leak stack traces) ----------
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[ServerError]', err.message);
  res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : err.message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`STB Singapore server running on http://localhost:${PORT}`);
});
